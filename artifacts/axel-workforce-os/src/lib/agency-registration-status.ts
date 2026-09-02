export interface AgencyRegistrationStatusSource {
  zoomScheduledAt?: string | Date | null;
}

export interface AgencyAgreementStatusSource {
  agreementSignedAt?: string | Date | null;
}

export interface AgencyEoStatusSource {
  eoCarrier?: string | null;
  eoPolicyNumber?: string | null;
  eoCoverageAmount?: string | number | null;
  eoExpirationDate?: string | Date | null;
  eoCertificateUrl?: string | null;
}

function formatAgencyDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { timeZone: "UTC" });
}

export function agencyAgreementStatus(
  agency: AgencyAgreementStatusSource | null | undefined,
  registration: AgencyRegistrationStatusSource | null | undefined,
) {
  if (agency?.agreementSignedAt) {
    const date = formatAgencyDate(agency.agreementSignedAt);
    if (date) return { label: `Agreement signed ${date}`, color: "green" as const };
  }
  if (registration?.zoomScheduledAt) return { label: "Call scheduled", color: "yellow" as const };
  if (registration) return { label: "Awaiting signature", color: "yellow" as const };
  return { label: "No agreement on file", color: "gray" as const };
}

export function agencyEoStatus(agency: AgencyEoStatusSource | null | undefined) {
  if (!agency?.eoExpirationDate) {
    const hasEoData = Boolean(
      agency?.eoCarrier ||
      agency?.eoPolicyNumber ||
      agency?.eoCoverageAmount ||
      agency?.eoCertificateUrl
    );
    return hasEoData
      ? { label: "E&O on file, no expiration date", color: "#E9C31E" }
      : null;
  }
  const expiration = new Date(agency.eoExpirationDate);
  const date = formatAgencyDate(agency.eoExpirationDate);
  if (Number.isNaN(expiration.getTime()) || !date) return null;
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const expirationKey =
    typeof agency.eoExpirationDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(agency.eoExpirationDate)
      ? agency.eoExpirationDate
      : expiration.toISOString().slice(0, 10);
  const expired = expirationKey < todayKey;
  const label = `${expired ? "E&O expired" : "E&O current through"} ${date}`;
  return { label, color: expired ? "#E91E1E" : "#1EE97B" };
}