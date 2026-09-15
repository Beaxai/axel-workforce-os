export type ControlledChannel = "MARKET" | "BROKER";

/** Structural half of the final send boundary. Recipient identity is resolved
 * by emailService after this check; this function prevents channel mixing
 * before any provider request can be constructed. */
export function hasControlledEnvelopeShape(input: {
  channel: ControlledChannel;
  to: string[];
  cc?: string[];
  bcc?: string[];
  dealMarketId?: string | null;
  recipientUserId?: string | null;
}): boolean {
  if (input.to.length !== 1 || input.cc?.length || input.bcc?.length) return false;
  return input.channel === "MARKET"
    ? Boolean(input.dealMarketId) && !input.recipientUserId
    : !input.dealMarketId && Boolean(input.recipientUserId);
}