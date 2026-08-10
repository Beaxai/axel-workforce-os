import { db, dealsTable, dealSubjectivitiesTable, activityLogTable, contactsTable, usersTable, quotesTable, type Deal } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { sendDealEmail } from "../services/emailService";
import { createBrokerFeePaymentLink } from "../services/stripeService";

// ---------------------------------------------------------------------------
// WC-2 Axel broker fee — deal-level, default 7% of premium, ADMIN/CSA-editable,
// negotiable, invoiced separately from carrier premium. TRACKED NON-BLOCKING:
// never gates submission or binding. If unpaid at bind, dunning notifies the
// client AND the agent with a payment link (link stubbed pending Q14 — no
// payment provider is wired yet).
// ---------------------------------------------------------------------------

export const BROKER_FEE_SYSTEM_KEY = "SUBJ_BROKER_FEE";

/**
 * Authoritative fee base: the WC annual premium (carrier premium, never WFS
 * service fees) from the deal's LATEST quote — the same source proposal
 * generation uses — falling back to deal.wcPremium / estimatedPremium when no
 * quote exists. Every surface (rail card, quote panel, proposal, dunning)
 * must display the server-computed amount from here; the frontend never
 * recalculates, so a re-rate can't leave two surfaces disclosing different fees.
 */
export async function resolveWcPremiumBase(deal: Pick<Deal, "id" | "wcPremium" | "estimatedPremium">): Promise<number | null> {
  const [quote] = await db
    .select({ wcPremium: quotesTable.wcPremium, wcRatingBreakdown: quotesTable.wcRatingBreakdown })
    .from(quotesTable)
    .where(eq(quotesTable.dealId, deal.id))
    .orderBy(desc(quotesTable.createdAt))
    .limit(1);
  if (quote) {
    const bd = (quote.wcRatingBreakdown as any)?.data || quote.wcRatingBreakdown;
    const fromQuote =
      bd?.result?.wcPremium ?? bd?.calculation?.finalPremium ?? bd?.finalPremium ?? Number(quote.wcPremium);
    if (Number.isFinite(Number(fromQuote))) return Number(fromQuote);
  }
  const fallback = Number(deal.wcPremium ?? deal.estimatedPremium ?? NaN);
  return Number.isFinite(fallback) ? fallback : null;
}

export async function computeBrokerFee(deal: Deal): Promise<{ percent: number; base: number | null; amount: number | null }> {
  const percent = Number(deal.brokerFeePercent ?? 7);
  const base = await resolveWcPremiumBase(deal);
  const amount = base != null && Number.isFinite(percent) ? Math.round(percent * base) / 100 : null;
  return { percent: Number.isFinite(percent) ? percent : 7, base, amount };
}

export async function setBrokerFeePercent(dealId: string, percent: number, actorName: string) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return { ok: false as const, error: "percent must be between 0 and 100" };
  }
  return db.transaction(async (tx) => {
    const [deal] = await tx.select().from(dealsTable).where(eq(dealsTable.id, dealId)).for("update");
    if (!deal) return { ok: false as const, error: "Deal not found" };
    const prev = Number(deal.brokerFeePercent ?? 7);
    const [row] = await tx
      .update(dealsTable)
      .set({ brokerFeePercent: percent.toFixed(2) })
      .where(eq(dealsTable.id, dealId))
      .returning();
    await tx.insert(activityLogTable).values({
      dealId,
      entityType: "deal",
      entityId: dealId,
      eventType: "broker_fee_changed",
      description: `Broker fee changed from ${prev}% to ${percent}% by ${actorName}.`,
      metadata: { from: prev, to: percent, changed_by: actorName },
    });
    return { ok: true as const, deal: row };
  });
}

/**
 * Mark the fee paid (or back to unpaid). Paid also satisfies the checklist's
 * broker-fee line (item 10) so the bind checklist reflects reality; unpaid
 * reopens it. Both directions are idempotent.
 */
export async function setBrokerFeeStatus(dealId: string, status: "PAID" | "UNPAID" | "WAIVED", actorName: string) {
  return db.transaction(async (tx) => {
    const [deal] = await tx.select().from(dealsTable).where(eq(dealsTable.id, dealId)).for("update");
    if (!deal) return { ok: false as const, error: "Deal not found" };
    if (deal.brokerFeeStatus === status) return { ok: true as const, deal, unchanged: true };

    const [row] = await tx
      .update(dealsTable)
      .set({
        brokerFeeStatus: status,
        brokerFeePaidAt: status === "PAID" ? new Date() : null,
      })
      .where(eq(dealsTable.id, dealId))
      .returning();

    // Checklist tie-in: the broker-fee subjectivity mirrors the fee status.
    const settled = status === "PAID" || status === "WAIVED";
    await tx
      .update(dealSubjectivitiesTable)
      .set(
        settled
          ? { status: status === "PAID" ? "SATISFIED" : "WAIVED", satisfiedAt: new Date(), updatedAt: new Date() }
          : { status: "OPEN", satisfiedAt: null, satisfiedBy: null, updatedAt: new Date() },
      )
      .where(and(eq(dealSubjectivitiesTable.dealId, dealId), eq(dealSubjectivitiesTable.systemKey, BROKER_FEE_SYSTEM_KEY)));

    const { amount } = await computeBrokerFee(row);
    await tx.insert(activityLogTable).values({
      dealId,
      entityType: "deal",
      entityId: dealId,
      eventType: "broker_fee_status_changed",
      description:
        status === "PAID"
          ? `Broker fee marked PAID by ${actorName}${amount != null ? ` ($${amount.toLocaleString()})` : ""}.`
          : status === "WAIVED"
            ? `Broker fee WAIVED by ${actorName}.`
            : `Broker fee reopened as UNPAID by ${actorName}.`,
      metadata: { status, changed_by: actorName, amount },
    });
    return { ok: true as const, deal: row };
  });
}

/**
 * Unpaid-at-bind dunning: notify client + agent with a payment link.
 * Stamped once (broker_fee_dunning_at, claimed under a row lock) so bind
 * retries/races can't double-send. Best-effort — caller must not let a
 * failure roll back or block the bind.
 */
export async function sendBrokerFeeDunning(deal: Deal): Promise<{ sent: boolean; reason?: string }> {
  // Claim the stamp first; only the claimer sends.
  const claimed = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(dealsTable).where(eq(dealsTable.id, deal.id)).for("update");
    if (!row) return null;
    if (row.brokerFeeStatus === "PAID" || row.brokerFeeStatus === "WAIVED") return null;
    if (row.brokerFeeDunningAt) return null; // already sent
    const [updated] = await tx
      .update(dealsTable)
      .set({ brokerFeeDunningAt: new Date() })
      .where(and(eq(dealsTable.id, deal.id), isNull(dealsTable.brokerFeeDunningAt)))
      .returning();
    return updated ?? null;
  });
  if (!claimed) return { sent: false, reason: "already sent, paid, or waived" };

  // Recipients: deal contacts with an email (client side) + producing agent/owner.
  const contacts = await db
    .select({ email: contactsTable.email })
    .from(contactsTable)
    .where(eq(contactsTable.dealId, deal.id));
  const to = contacts.map((c) => c.email).filter((e): e is string => !!e && e.includes("@"));

  const agentIds = [claimed.producingAgentId, claimed.ownerId].filter((v): v is string => !!v);
  for (const id of agentIds) {
    const [u] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, id));
    if (u?.email && !to.includes(u.email)) to.push(u.email);
  }

  if (to.length === 0) {
    console.warn(`[broker-fee] dunning for deal ${deal.id}: no recipient emails found (contacts/agent)`);
    await db.insert(activityLogTable).values({
      dealId: deal.id,
      entityType: "deal",
      entityId: deal.id,
      eventType: "broker_fee_dunning",
      description: "Broker fee unpaid at bind — dunning could not be sent (no recipient emails on file).",
      metadata: { sent: false, reason: "no recipients" },
    });
    return { sent: false, reason: "no recipients" };
  }

  const { amount, percent: pct } = await computeBrokerFee(claimed);
  const business = claimed.businessName || "your business";
  // Q14 resolved: Stripe. Real payment link when configured and an amount is
  // known; otherwise fall back to the portal stub — dunning is never blocked
  // by the payment provider.
  const stripeLink =
    amount != null && amount > 0 ? await createBrokerFeePaymentLink({ dealId: deal.id, businessName: business, amount }) : null;
  const paymentLink = stripeLink || `${process.env.CLIENT_URL || ""}/pay/broker-fee/${deal.id}`;

  await sendDealEmail({
    dealId: deal.id,
    to,
    subject: `Axel broker fee outstanding — ${business}`,
    text:
      `Congratulations — coverage for ${business} is bound.\n\n` +
      `Our records show the Axel broker fee (${pct}% of premium${amount != null ? `, $${amount.toLocaleString()}` : ""}) is still outstanding. ` +
      `This is invoiced separately from your carrier premium and does not affect your coverage.\n\n` +
      `Pay online: ${paymentLink}\n\n` +
      `Questions? Just reply to this email — it routes straight to your deal team.`,
    sentBy: "System (broker-fee dunning)",
  });

  await db.insert(activityLogTable).values({
    dealId: deal.id,
    entityType: "deal",
    entityId: deal.id,
    eventType: "broker_fee_dunning",
    description: `Broker fee unpaid at bind — dunning sent to ${to.join(", ")}.`,
    metadata: { sent: true, recipients: to, amount, percent: pct, payment_link: paymentLink },
  });
  return { sent: true };
}
