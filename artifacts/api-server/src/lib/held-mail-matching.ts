import {
  correspondenceThreadsTable,
  dealMarketEmailAddressesTable,
  dealMarketsTable,
  dealsTable,
  marketsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type HeldMatchCandidate = {
  dealId: string;
  dealName: string;
  channel: "MARKET" | "BROKER";
  dealMarketId: string | null;
  marketName: string | null;
  evidence: string[];
};

export type HeldMatchResolution =
  | { candidate: HeldMatchCandidate; threadId: string; listenerEmail: string; orgId: string | null }
  | { candidate: null; unavailableReason: string };

type MatchingQuery = Pick<typeof import("@workspace/db").db, "select">;

function addressOnly(value: string): string | null {
  const address = (value.match(/<([^>]+)>/)?.[1] ?? value).trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+$/.test(address) ? address : null;
}

async function providerDestination(providerReceivedEmailId: string | null): Promise<
  { destination: string } | { unavailableReason: string }
> {
  if (!providerReceivedEmailId || !process.env.RESEND_API_KEY) {
    return { unavailableReason: "PROVIDER_PROVENANCE_UNAVAILABLE" };
  }
  try {
    const response = await fetch(
      `https://api.resend.com/emails/receiving/${encodeURIComponent(providerReceivedEmailId)}`,
      {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) return { unavailableReason: "PROVIDER_PROVENANCE_UNAVAILABLE" };
    const payload: any = await response.json();
    const data = payload?.data ?? payload;
    const returnedProviderId = data?.id ?? data?.email_id;
    if (returnedProviderId != null && String(returnedProviderId) !== providerReceivedEmailId) {
      return { unavailableReason: "PROVIDER_ID_MISMATCH" };
    }
    const to = Array.isArray(data?.to) ? data.to : [];
    const cc = Array.isArray(data?.cc) ? data.cc : [];
    const bcc = Array.isArray(data?.bcc) ? data.bcc : [];
    // Matching authority is deliberately narrower than message display: one
    // provider-recorded SMTP destination and no copied destination.
    if (to.length !== 1 || cc.length !== 0 || bcc.length !== 0 || typeof to[0] !== "string") {
      return { unavailableReason: "AMBIGUOUS_PROVIDER_DESTINATION" };
    }
    const destination = addressOnly(to[0]);
    if (!destination) return { unavailableReason: "INVALID_PROVIDER_DESTINATION" };
    return { destination };
  } catch {
    return { unavailableReason: "PROVIDER_PROVENANCE_UNAVAILABLE" };
  }
}

/**
 * Re-fetch the provider's received-email record and resolve its sole
 * destination through controlled listener records. Nothing persisted from the
 * inbound message itself is accepted as destination evidence.
 */
export async function resolveHeldMatchCandidate(
  providerReceivedEmailId: string | null,
  query: MatchingQuery,
): Promise<HeldMatchResolution> {
  const provider = await providerDestination(providerReceivedEmailId);
  if ("unavailableReason" in provider) return { candidate: null, unavailableReason: provider.unavailableReason };

  const [marketRows, brokerRows] = await Promise.all([
    query.select({
      dealId: dealsTable.id,
      dealName: dealsTable.businessName,
      orgId: dealsTable.orgId,
      dealMarketId: dealMarketsTable.id,
      marketName: marketsTable.name,
      threadId: correspondenceThreadsTable.id,
      threadListener: correspondenceThreadsTable.listenerEmail,
    }).from(dealMarketEmailAddressesTable)
      .innerJoin(dealMarketsTable, and(
        eq(dealMarketsTable.id, dealMarketEmailAddressesTable.dealMarketId),
        eq(dealMarketsTable.dealId, dealMarketEmailAddressesTable.dealId),
      ))
      .innerJoin(dealsTable, eq(dealsTable.id, dealMarketEmailAddressesTable.dealId))
      .innerJoin(marketsTable, eq(marketsTable.id, dealMarketsTable.marketId))
      .innerJoin(correspondenceThreadsTable, and(
        eq(correspondenceThreadsTable.dealMarketId, dealMarketsTable.id),
        eq(correspondenceThreadsTable.dealId, dealsTable.id),
        eq(correspondenceThreadsTable.channel, "MARKET"),
        eq(correspondenceThreadsTable.listenerEmail, dealMarketEmailAddressesTable.emailAddress),
      ))
      .where(eq(dealMarketEmailAddressesTable.emailAddress, provider.destination)),
    query.select({
      dealId: dealsTable.id,
      dealName: dealsTable.businessName,
      orgId: dealsTable.orgId,
      threadId: correspondenceThreadsTable.id,
    }).from(correspondenceThreadsTable)
      .innerJoin(dealsTable, eq(dealsTable.id, correspondenceThreadsTable.dealId))
      .where(and(
        eq(correspondenceThreadsTable.listenerEmail, provider.destination),
        eq(correspondenceThreadsTable.channel, "BROKER"),
      )),
  ]);

  const destinations = [
    ...marketRows.map((row) => ({
      candidate: {
        dealId: row.dealId,
        dealName: row.dealName || "Unnamed deal",
        channel: "MARKET" as const,
        dealMarketId: row.dealMarketId,
        marketName: row.marketName,
        evidence: [
          "Provider-confirmed sole destination",
          "Unique Axel-controlled market listener",
          "Listener, deal, market, and thread are consistent",
        ],
      },
      orgId: row.orgId,
      threadId: row.threadId,
      listenerEmail: row.threadListener,
    })),
    ...brokerRows.map((row) => ({
      candidate: {
        dealId: row.dealId,
        dealName: row.dealName || "Unnamed deal",
        channel: "BROKER" as const,
        dealMarketId: null,
        marketName: null,
        evidence: [
          "Provider-confirmed sole destination",
          "Unique Axel-controlled broker listener",
          "Listener, deal, and thread are consistent",
        ],
      },
      orgId: row.orgId,
      threadId: row.threadId,
      listenerEmail: provider.destination,
    })),
  ];
  if (destinations.length === 0) return { candidate: null, unavailableReason: "NO_CONTROLLED_DESTINATION" };
  if (destinations.length !== 1) return { candidate: null, unavailableReason: "AMBIGUOUS_CONTROLLED_DESTINATION" };
  return destinations[0];
}