export interface DealDisplayNameSource {
  accountBusinessName?: unknown;
  account?: {
    businessName?: unknown;
  } | null;
  clientName?: unknown;
  businessName?: unknown;
  referenceCode?: unknown;
}

function nonBlankText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function dealDisplayName(deal: DealDisplayNameSource): string {
  return (
    nonBlankText(deal.accountBusinessName) ||
    nonBlankText(deal.account?.businessName) ||
    nonBlankText(deal.clientName) ||
    nonBlankText(deal.businessName) ||
    nonBlankText(deal.referenceCode) ||
    "Untitled deal"
  );
}