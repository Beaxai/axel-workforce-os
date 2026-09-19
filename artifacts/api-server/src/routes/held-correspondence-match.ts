import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  activityLogTable,
  correspondenceThreadsTable,
  db,
  dealEmailAddressesTable,
  dealInboundEmailsTable,
  dealMarketEmailAddressesTable,
  dealMarketsTable,
  dealOutboundEmailsTable,
  dealsTable,
} from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getTrustedCorrespondenceActor, trustedActorMayAccessDeal } from "../lib/correspondence-policy";

const router: IRouter = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_TTL_SECONDS = 5 * 60;

type Query = Pick<typeof db, "select">;
type InboundRow = typeof dealInboundEmailsTable.$inferSelect;
type Candidate = {
  dealId: string;
  dealName: string;
  dealMarketId: string | null;
  threadId: string;
  channel: "MARKET" | "BROKER";
  listenerEmail: string;
  senderEmail: string;
  providerReceivedEmailId: string;
  evidenceSummary: string[];
};
type ProviderEvidence = {
  providerId: string;
  storedMessageId: string;
  rfcMessageId: string;
  senderEmail: string;
  recipientEmail: string;
  storedToEmails: string[];
  storedCcEmails: string[];
  providerBccEmails: string[];
  replyIds: string[];
  digest: string;
};
type ConfirmationPayload = {
  v: 1;
  exp: number;
  actorId: string;
  actorOrgId: string;
  inboundId: string;
  evidenceDigest: string;
  candidateDigest: string;
};

class MatchError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function isSerializationConflict(error: unknown): boolean {
  let current: unknown = error;
  // Drizzle may wrap the driver error (and some drivers wrap it once more).
  // Keep traversal bounded and inspect only SQLSTATE, never error text.
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    const wrapped = current as { code?: unknown; cause?: unknown };
    if (wrapped.code === "40001" || wrapped.code === "40P01") return true;
    current = wrapped.cause;
  }
  return false;
}

function addressOnly(value: unknown): string {
  const text = String(value ?? "");
  return (text.match(/<([^>]+)>/)?.[1] ?? text).trim().toLowerCase();
}

function addressList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(addressOnly).filter(Boolean);
  if (typeof value === "string") return value.split(",").map(addressOnly).filter(Boolean);
  return [];
}

function providerHeaders(data: any): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (name: unknown, value: unknown) => {
    const key = String(name ?? "").trim().toLowerCase();
    if (!key) return;
    out.set(key, [...(out.get(key) ?? []), String(value ?? "").trim()]);
  };
  if (Array.isArray(data?.headers)) {
    for (const header of data.headers) add(header?.name, header?.value);
  } else if (data?.headers && typeof data.headers === "object") {
    for (const [name, value] of Object.entries(data.headers)) add(name, value);
  }
  return out;
}

function digest(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("base64url");
}

function tokenKey(): Buffer {
  const secret = process.env.CORRESPONDENCE_CONFIRMATION_SECRET ?? process.env.RESEND_API_KEY;
  if (!secret) throw new MatchError("CONFIRMATION_UNAVAILABLE", 503, "Held-match confirmation signing is not configured");
  return crypto.createHmac("sha256", secret).update("axel-held-match-confirmation-v1").digest();
}

function signToken(payload: ConfirmationPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", tokenKey()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyToken(token: string): ConfirmationPayload {
  const parts = token.split(".");
  if (parts.length !== 2) throw new MatchError("INVALID_CONFIRMATION", 409, "Invalid match confirmation token");
  const expected = crypto.createHmac("sha256", tokenKey()).update(parts[0]).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(parts[1], "base64url");
  } catch {
    throw new MatchError("INVALID_CONFIRMATION", 409, "Invalid match confirmation token");
  }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    throw new MatchError("INVALID_CONFIRMATION", 409, "Invalid match confirmation token");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    throw new MatchError("INVALID_CONFIRMATION", 409, "Invalid match confirmation token");
  }
  const parsed = z.object({
    v: z.literal(1),
    exp: z.number().int(),
    actorId: z.string().uuid(),
    actorOrgId: z.string().uuid(),
    inboundId: z.string().uuid(),
    evidenceDigest: z.string().min(1),
    candidateDigest: z.string().min(1),
  }).strict().safeParse(payload);
  if (!parsed.success || parsed.data.exp < Math.floor(Date.now() / 1000)) {
    throw new MatchError("INVALID_CONFIRMATION", 409, "Match confirmation token is invalid or expired");
  }
  return parsed.data;
}

async function fetchProviderEvidence(row: InboundRow): Promise<ProviderEvidence> {
  if (!process.env.RESEND_API_KEY || !row.providerReceivedEmailId) {
    throw new MatchError("PROVIDER_UNAVAILABLE", 503, "Provider received-email retrieval is unavailable for this message");
  }
  let response: Response;
  try {
    response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(row.providerReceivedEmailId)}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new MatchError("PROVIDER_UNAVAILABLE", 502, "Provider received-email retrieval failed");
  }
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new MatchError("PROVIDER_UNAVAILABLE", 502, `Provider received-email retrieval failed (${response.status})`);
  const data = payload.data ?? payload;
  const providerId = String(data.id ?? data.email_id ?? "");
  const headers = providerHeaders(data);
  const messageIds = headers.get("message-id")?.filter(Boolean) ?? [];
  // Resend's received-email contract supplies the RFC identity at top level.
  // The optional raw header copy is corroboration, not a required field.
  const rfcMessageId = typeof data.message_id === "string" ? data.message_id.trim() : "";
  const from = addressOnly(data.from);
  const to = addressList(data.to);
  const cc = addressList(data.cc);
  const bcc = addressList(data.bcc);
  const storedTo = Array.isArray(row.toEmails) ? row.toEmails.map(addressOnly).filter(Boolean) : [];
  const storedCc = Array.isArray(row.ccEmails) ? row.ccEmails.map(addressOnly).filter(Boolean) : [];
  // Current webhook rows use Resend's received-email ID as messageId. Older
  // rows may instead retain the RFC Message-ID. Accept precisely those two
  // storage forms; do not infer or substitute either identity.
  const canonicalProviderIdentity =
    row.messageId === providerId && row.providerReceivedEmailId === providerId;
  const legacyRfcIdentity =
    row.messageId !== providerId && row.messageId === rfcMessageId;
  if (
    providerId !== row.providerReceivedEmailId ||
    !rfcMessageId ||
    messageIds.length > 1 ||
    (messageIds.length === 1 && messageIds[0] !== rfcMessageId) ||
    (!canonicalProviderIdentity && !legacyRfcIdentity) ||
    from !== addressOnly(row.fromEmail) ||
    to.length !== 1 ||
    storedTo.length !== 1 ||
    to[0] !== storedTo[0] ||
    cc.length !== 0 ||
    // Missing/null or an empty array is the only safe BCC envelope. Reject
    // malformed values too; normalization must not hide unknown recipients.
    (data.bcc != null && (!Array.isArray(data.bcc) || data.bcc.length !== 0)) ||
    storedCc.length !== 0
  ) {
    throw new MatchError("EVIDENCE_MISMATCH", 409, "Provider identity, sender, or recipient evidence does not exactly match the stored original");
  }
  const replyIds = [
    ...(headers.get("in-reply-to") ?? []),
    ...(headers.get("references") ?? []),
  ].flatMap((value) => value.match(/<[^>]+>/g) ?? (value.trim() ? [value.trim()] : []));
  const evidence = {
    providerId,
    storedMessageId: row.messageId,
    rfcMessageId,
    senderEmail: from,
    recipientEmail: to[0],
    storedToEmails: storedTo,
    storedCcEmails: storedCc,
    providerBccEmails: bcc,
    replyIds: [...new Set(replyIds)],
  };
  return { ...evidence, digest: digest(evidence) };
}

async function deriveCandidate(evidence: ProviderEvidence, query: Query = db): Promise<Candidate> {
  const rows = await query.select({
      threadId: correspondenceThreadsTable.id,
      channel: correspondenceThreadsTable.channel,
      dealId: correspondenceThreadsTable.dealId,
      dealMarketId: correspondenceThreadsTable.dealMarketId,
      listenerEmail: correspondenceThreadsTable.listenerEmail,
      dealName: dealsTable.businessName,
      marketDealId: dealMarketsTable.dealId,
      marketListenerDealId: dealMarketEmailAddressesTable.dealId,
      marketListener: dealMarketEmailAddressesTable.emailAddress,
    }).from(correspondenceThreadsTable)
      .innerJoin(dealsTable, eq(dealsTable.id, correspondenceThreadsTable.dealId))
      .leftJoin(dealMarketsTable, eq(dealMarketsTable.id, correspondenceThreadsTable.dealMarketId))
      .leftJoin(dealMarketEmailAddressesTable, eq(dealMarketEmailAddressesTable.dealMarketId, correspondenceThreadsTable.dealMarketId))
      .where(sql`lower(${correspondenceThreadsTable.listenerEmail}) = ${evidence.recipientEmail}`);
  const marketClaims = await query.select({
      dealMarketId: dealMarketEmailAddressesTable.dealMarketId,
      dealId: dealMarketEmailAddressesTable.dealId,
      email: dealMarketEmailAddressesTable.emailAddress,
    }).from(dealMarketEmailAddressesTable)
      .where(sql`lower(${dealMarketEmailAddressesTable.emailAddress}) = ${evidence.recipientEmail}`);
  const dealClaims = await query.select({
      dealId: dealEmailAddressesTable.dealId,
      email: dealEmailAddressesTable.emailAddress,
    }).from(dealEmailAddressesTable)
      .where(sql`lower(${dealEmailAddressesTable.emailAddress}) = ${evidence.recipientEmail}`);
  // A case-variant collision remains a collision even though each individual
  // table has a case-sensitive unique index. A general deal listener is also a
  // competing routing identity and can never be silently overridden.
  const compatibleMarketPair =
    rows.length === 1 &&
    marketClaims.length === 1 &&
    rows[0].channel === "MARKET" &&
    rows[0].dealMarketId === marketClaims[0].dealMarketId &&
    rows[0].dealId === marketClaims[0].dealId &&
    rows[0].marketDealId === rows[0].dealId &&
    rows[0].marketListenerDealId === rows[0].dealId;
  if (
    rows.length > 1 ||
    marketClaims.length > 1 ||
    (rows.length > 0 && dealClaims.length > 0) ||
    (rows.length > 0 && marketClaims.length > 0 && !compatibleMarketPair)
  ) {
    throw new MatchError("AMBIGUOUS_CANDIDATE", 409, "The recipient is claimed by multiple persisted listener identities");
  }
  const valid = rows.filter((row) =>
    (row.channel === "BROKER" && row.dealMarketId === null && marketClaims.length === 0) ||
    (
      row.channel === "MARKET" &&
      row.dealMarketId !== null &&
      row.marketDealId === row.dealId &&
      row.marketListenerDealId === row.dealId &&
      marketClaims.length === 1 &&
      marketClaims[0].dealMarketId === row.dealMarketId &&
      marketClaims[0].dealId === row.dealId &&
      row.marketListener?.toLowerCase() === evidence.recipientEmail
    ),
  );
  if (valid.length === 0) throw new MatchError("NO_CANDIDATE", 409, "No persisted listener and thread association matches this message");
  if (valid.length !== 1) throw new MatchError("AMBIGUOUS_CANDIDATE", 409, "The recipient resolves to more than one persisted correspondence destination");
  const row = valid[0];
  if ((row.channel !== "MARKET" && row.channel !== "BROKER") || !row.dealName) {
    throw new MatchError("INVALID_CANDIDATE", 409, "The persisted correspondence destination is incomplete");
  }

  if (evidence.replyIds.length) {
    const references = await query.select({
      dealId: dealOutboundEmailsTable.dealId,
      dealMarketId: dealOutboundEmailsTable.dealMarketId,
      threadId: dealOutboundEmailsTable.correspondenceThreadId,
      channel: dealOutboundEmailsTable.channel,
    }).from(dealOutboundEmailsTable).where(inArray(dealOutboundEmailsTable.rfcMessageId, evidence.replyIds));
    const contradiction = references.some((reference) =>
      reference.dealId !== row.dealId ||
      (reference.dealMarketId ?? null) !== (row.dealMarketId ?? null) ||
      reference.threadId !== row.threadId ||
      reference.channel !== row.channel
    );
    if (contradiction) throw new MatchError("REFERENCE_CONTRADICTION", 409, "A known reply reference contradicts the listener destination or channel");
  }

  return {
    dealId: row.dealId,
    dealName: row.dealName,
    dealMarketId: row.dealMarketId,
    threadId: row.threadId,
    channel: row.channel,
    listenerEmail: row.listenerEmail,
    senderEmail: evidence.senderEmail,
    providerReceivedEmailId: evidence.providerId,
    evidenceSummary: [
      "Provider received-email identity matches the stored original",
      "Exactly one original To recipient and no CC or BCC recipients",
      `Recipient matches one persisted ${row.channel.toLowerCase()} listener and thread`,
      ...(evidence.replyIds.length ? ["All known reply references agree with the destination and channel"] : []),
    ],
  };
}

function candidateDigest(candidate: Candidate): string {
  return digest({
    dealId: candidate.dealId,
    dealMarketId: candidate.dealMarketId,
    threadId: candidate.threadId,
    channel: candidate.channel,
    listenerEmail: candidate.listenerEmail.toLowerCase(),
    senderEmail: candidate.senderEmail.toLowerCase(),
    providerReceivedEmailId: candidate.providerReceivedEmailId,
  });
}

async function unmatchedRow(messageId: string, query: Query = db): Promise<InboundRow> {
  const [row] = await query.select().from(dealInboundEmailsTable)
    .where(and(
      eq(dealInboundEmailsTable.id, messageId),
      eq(dealInboundEmailsTable.channel, "HELD"),
      sql`${dealInboundEmailsTable.dealId} IS NULL`,
      sql`${dealInboundEmailsTable.dealMarketId} IS NULL`,
      sql`${dealInboundEmailsTable.correspondenceThreadId} IS NULL`,
    )).limit(1);
  if (!row) throw new MatchError("NOT_UNMATCHED", 409, "Held message is missing, already associated, or no longer unmatched");
  return row;
}

const previewBody = z.object({}).strict();
const matchBody = z.object({
  confirmationToken: z.string().min(1),
  destinationConfirmed: z.literal(true),
}).strict();

router.post("/correspondence/held/:messageId/match-preview", async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.messageId)) return res.status(400).json({ error: "Invalid inbound message identifier" });
    const parsed = previewBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Match preview body must be an empty object", issues: parsed.error.issues });
    const actor = await getTrustedCorrespondenceActor(req.user);
    if (!actor) return res.status(403).json({ error: "Trusted Axel correspondence staff required" });
    const row = await unmatchedRow(req.params.messageId);
    const evidence = await fetchProviderEvidence(row);
    const candidate = await deriveCandidate(evidence);
    if (!(await trustedActorMayAccessDeal(req.user, candidate.dealId))) {
      return res.status(403).json({ error: "Candidate destination belongs to another organization" });
    }
    const confirmationToken = signToken({
      v: 1,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      actorId: actor.id,
      actorOrgId: actor.orgId,
      inboundId: row.id,
      evidenceDigest: evidence.digest,
      candidateDigest: candidateDigest(candidate),
    });
    return res.json({ candidate: { ...candidate, confirmationToken } });
  } catch (error) {
    if (error instanceof MatchError) return res.status(error.status).json({ error: error.message, code: error.code });
    throw error;
  }
});

router.post("/correspondence/held/:messageId/match", async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.messageId)) return res.status(400).json({ error: "Invalid inbound message identifier" });
    const parsed = matchBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid match confirmation", issues: parsed.error.issues });
    const actor = await getTrustedCorrespondenceActor(req.user);
    if (!actor) return res.status(403).json({ error: "Trusted Axel correspondence staff required" });
    const token = verifyToken(parsed.data.confirmationToken);
    if (token.inboundId !== req.params.messageId || token.actorId !== actor.id || token.actorOrgId !== actor.orgId) {
      throw new MatchError("INVALID_CONFIRMATION", 409, "Match confirmation is not valid for this actor or message");
    }

    // Provider evidence is deliberately fetched again after confirmation. It is
    // read-only and no preview result is trusted as current routing authority.
    const initialRow = await unmatchedRow(req.params.messageId);
    const evidence = await fetchProviderEvidence(initialRow);
    if (evidence.digest !== token.evidenceDigest) throw new MatchError("EVIDENCE_CHANGED", 409, "Provider evidence changed after preview");

    const outcome = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM deal_inbound_emails WHERE id = ${req.params.messageId} FOR UPDATE`);
      const row = await unmatchedRow(req.params.messageId, tx);
      if (digest({
        providerId: row.providerReceivedEmailId,
        storedMessageId: row.messageId,
        rfcMessageId: evidence.rfcMessageId,
        senderEmail: addressOnly(row.fromEmail),
        recipientEmail: evidence.recipientEmail,
        storedToEmails: Array.isArray(row.toEmails) ? row.toEmails.map(addressOnly).filter(Boolean) : [],
        storedCcEmails: Array.isArray(row.ccEmails) ? row.ccEmails.map(addressOnly).filter(Boolean) : [],
        providerBccEmails: evidence.providerBccEmails,
        replyIds: evidence.replyIds,
      }) !== evidence.digest) throw new MatchError("EVIDENCE_CHANGED", 409, "Stored message identity changed after provider validation");

      const candidateBeforeLocks = await deriveCandidate(evidence, tx);
      await tx.execute(sql`SELECT id FROM deals WHERE id = ${candidateBeforeLocks.dealId} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM correspondence_threads WHERE id = ${candidateBeforeLocks.threadId} FOR UPDATE`);
      if (candidateBeforeLocks.dealMarketId) {
        await tx.execute(sql`SELECT id FROM deal_markets WHERE id = ${candidateBeforeLocks.dealMarketId} FOR UPDATE`);
        await tx.execute(sql`SELECT id FROM deal_market_email_addresses WHERE deal_market_id = ${candidateBeforeLocks.dealMarketId} FOR UPDATE`);
      }
      for (const replyId of evidence.replyIds) {
        await tx.execute(sql`SELECT id FROM deal_outbound_emails WHERE rfc_message_id = ${replyId} FOR UPDATE`);
      }
      // Membership, user, organization, and explicit trust are all routing
      // authority here, so hold them stable through association and audit.
      await tx.execute(sql`SELECT id FROM users WHERE id = ${actor.id} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM organizations WHERE id = ${actor.orgId} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM org_members WHERE user_id = ${actor.id} AND is_primary_org = true FOR UPDATE`);
      await tx.execute(sql`SELECT org_id FROM trusted_axel_organizations WHERE org_id = ${actor.orgId} FOR UPDATE`);
      const access = await trustedActorMayAccessDeal(req.user, candidateBeforeLocks.dealId, tx);
      if (!access) throw new MatchError("FORBIDDEN_CANDIDATE", 403, "Candidate destination belongs to another organization");
      const candidate = await deriveCandidate(evidence, tx);
      if (candidateDigest(candidate) !== token.candidateDigest) {
        throw new MatchError("CANDIDATE_CHANGED", 409, "Correspondence destination changed after preview");
      }
      const [updated] = await tx.update(dealInboundEmailsTable).set({
        dealId: candidate.dealId,
        dealMarketId: candidate.dealMarketId,
        correspondenceThreadId: candidate.threadId,
        heldReason: "SENDER_NOT_APPROVED_FOR_THREAD",
      }).where(and(
        eq(dealInboundEmailsTable.id, row.id),
        eq(dealInboundEmailsTable.channel, "HELD"),
        sql`${dealInboundEmailsTable.dealId} IS NULL`,
        sql`${dealInboundEmailsTable.dealMarketId} IS NULL`,
        sql`${dealInboundEmailsTable.correspondenceThreadId} IS NULL`,
      )).returning({ id: dealInboundEmailsTable.id });
      if (!updated) throw new MatchError("MATCH_CONFLICT", 409, "Held message was concurrently matched or reclassified");
      await tx.insert(activityLogTable).values({
        dealId: candidate.dealId,
        dealMarketId: candidate.dealMarketId,
        entityType: "deal",
        entityId: candidate.dealId,
        eventType: "inbound_email_matched",
        description: `Unmatched held email associated with a ${candidate.channel.toLowerCase()} correspondence thread`,
        createdBy: actor.id,
        metadata: {
          correspondence_private: true,
          inbound_email_id: row.id,
          matched_by: actor.id,
          matched_channel: candidate.channel,
          correspondence_thread_id: candidate.threadId,
          provider_received_email_id: evidence.providerId,
          sender_email: evidence.senderEmail,
        },
      });
      return candidate;
    }, { isolationLevel: "serializable" });
    return res.json({ associated: true, messageId: req.params.messageId, dealId: outcome.dealId, channel: "HELD" });
  } catch (error) {
    if (error instanceof MatchError) return res.status(error.status).json({ error: error.message, code: error.code });
    if (isSerializationConflict(error)) {
      return res.status(409).json({
        error: "Correspondence evidence changed concurrently; request a new match preview and retry",
        code: "MATCH_SERIALIZATION_CONFLICT",
      });
    }
    throw error;
  }
});

export default router;