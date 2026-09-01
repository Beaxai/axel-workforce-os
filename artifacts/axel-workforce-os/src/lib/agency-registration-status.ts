export interface AgencyRegistrationStatusSource {
  agreementSignedAt?: string | Date | null;
  zoomScheduledAt?: string | Date | null;
  eoExpirationDate?: string | Date | null;
}

export function agencyRegistrationStatus(registration: AgencyRegistrationStatusSource | null | undefined) {
  if (!registration) return { label: "No registration", color: "gray" as const };
  if (registration.zoomScheduledAt) return { label: "Call scheduled", color: "yellow" as const };
  if (registration.agreementSignedAt) return { label: "Agreement signed", color: "green" as const };
  return { label: "Awaiting signature", color: "yellow" as const };
}

export function agencyEoStatus(registration: AgencyRegistrationStatusSource | null | undefined) {
  if (!registration?.eoExpirationDate) return null;
  const expiration = new Date(registration.eoExpirationDate);
  if (Number.isNaN(expiration.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const label = `${expiration < today ? "E&O expired" : "E&O current through"} ${expiration.toLocaleDateString()}`;
  return { label, color: expiration < today ? "#E91E1E" : "#1EE97B" };
}