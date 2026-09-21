export type ProducerRegistrationStatusInput = {
  decision: "pending" | "approved" | "declined";
  packetSentAt?: Date | string | null;
  packetSignedAt?: Date | string | null;
  callScheduledFor?: Date | string | null;
  callCompletedAt?: Date | string | null;
  countersignedAt?: Date | string | null;
  credentialsIssuedAt?: Date | string | null;
};

export type ProducerRegistrationDisplayStatus =
  | "Declined"
  | "Active"
  | "Approved – Credentials Pending"
  | "Approved – Countersign Pending"
  | "Ready for Decision"
  | "Call Complete – Packet Pending"
  | "Packet Signed – Call Pending"
  | "Call Scheduled"
  | "Packet Sent"
  | "Submitted";

/**
 * A pure projection of persisted milestones. Provider arrival order does not
 * alter priority. Countersigned approvals receive an explicit credentials-
 * pending state rather than being represented as still awaiting countersign.
 */
export function deriveProducerRegistrationDisplayStatus(
  registration: ProducerRegistrationStatusInput,
): ProducerRegistrationDisplayStatus {
  if (registration.decision === "declined") return "Declined";
  if (registration.credentialsIssuedAt) return "Active";
  if (registration.decision === "approved" && registration.countersignedAt) {
    return "Approved – Credentials Pending";
  }
  if (registration.decision === "approved") {
    return "Approved – Countersign Pending";
  }
  if (registration.packetSignedAt && registration.callCompletedAt) {
    return "Ready for Decision";
  }
  if (registration.callCompletedAt) return "Call Complete – Packet Pending";
  if (registration.packetSignedAt) return "Packet Signed – Call Pending";
  if (registration.callScheduledFor) return "Call Scheduled";
  if (registration.packetSentAt) return "Packet Sent";
  return "Submitted";
}