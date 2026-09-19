import type { Market, Message } from "./types";
export const markets: Market[] = [
  { dealMarketId: "cornerstone", marketName: "Cornerstone", verticalRank: "1", isActive: true, isPrimary: true, isSelected: true, sendStatus: "SENT", marketStatus: "QUOTE_RECEIVED", appetiteOutcome: "Quoted", generatedRate: 28460, sendAttemptCount: 1, assignedUnderwriter: { name: "Mara Torres", email: "mtorres@cornerstone.example" } },
  { dealMarketId: "decision", marketName: "Decision HR", verticalRank: "2", isActive: true, sendStatus: "SENT", appetiteOutcome: "Reviewing", generatedRate: 30120, sendAttemptCount: 1, assignedUnderwriter: { name: "Jon Bell", email: "jbell@decisionhr.example" } },
  { dealMarketId: "peoplease", marketName: "Peoplease", verticalRank: "3", isActive: false, sendStatus: "PENDING", appetiteOutcome: "Not submitted", engagementSource: "PROMOTE" },
];
export const correspondence: Record<string, Message[]> = {
  cornerstone: [
    { id: "in-1", direction: "INBOUND", from: { name: "Mara Torres", email: "mtorres@cornerstone.example" }, to: ["submissions@axel.example"], subject: "Northstar Fabrication — indication", receivedAt: "2025-04-18T15:24:00", bodyText: "We can support the manufacturing class mix as submitted. Attached indication reflects the current payroll and loss history." },
    { id: "out-1", direction: "OUTBOUND", from: { email: "csa@axel.example" }, to: ["mtorres@cornerstone.example"], subject: "Update regarding Northstar Fabrication", sentAt: "2025-04-18T16:02:00", deliveryState: "sent", bodyText: "Thank you, Mara. Please hold the indication while we confirm the final employee count." },
  ],
  decision: [{ id: "in-2", direction: "INBOUND", from: { name: "Jon Bell", email: "jbell@decisionhr.example" }, to: ["submissions@axel.example"], subject: "Northstar Fabrication submission", receivedAt: "2025-04-18T14:40:00", bodyText: "Received. Our underwriting team is reviewing the schedule and will follow up with any questions." }],
  peoplease: [],
};
export const held: Message = { id: "held-1", direction: "INBOUND", from: { name: "M. Torres", email: "mara.torres@cornerstone-review.example" }, to: ["submissions@axel.example"], subject: "RE: Northstar Fabrication — indication", receivedAt: "2025-04-18T16:18:00", bodyText: "Please use the revised employee count below before binding.", channel: "EMAIL", dealId: "deal-northstar", dealName: "Northstar Fabrication", threadLabel: "Cornerstone", isReleasable: true, candidate: { channel: "EMAIL", marketName: "Cornerstone", contactEmail: "mtorres@cornerstone.example" } };