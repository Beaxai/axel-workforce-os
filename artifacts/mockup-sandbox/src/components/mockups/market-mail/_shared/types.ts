// Source shape adapted from axel-workforce-os/src/components/deal-card/types.ts.
export type Message = {
  id: string; direction: "INBOUND" | "OUTBOUND"; from: { name?: string; email: string };
  to: string[]; cc?: string[]; subject?: string; bodyText?: string; receivedAt?: string; sentAt?: string;
  deliveryState?: string; enrichment?: "PENDING" | "FAILED" | "COMPLETE"; channel?: string;
  dealId?: string; dealName?: string; threadLabel?: string; isReleasable?: boolean;
  candidate?: { channel: string; marketName?: string; contactEmail?: string };
};
export type Market = { dealMarketId: string; marketName: string; verticalRank?: string; isActive: boolean; isPrimary?: boolean; isSelected?: boolean; sendStatus: string; marketStatus?: string; appetiteOutcome?: string; generatedRate?: number; sendAttemptCount?: number; engagementSource?: string; assignedUnderwriter?: { name: string; email: string } };
export const c = {
  textPrimary: "#111", textSecondary: "rgba(0,0,0,0.68)", textMuted: "rgba(0,0,0,0.58)",
  bg: "#f4f4f5", cardBg: "rgba(0,0,0,0.03)", borderColor: "rgba(0,0,0,0.1)", hoverBg: "rgba(0,0,0,0.04)",
};