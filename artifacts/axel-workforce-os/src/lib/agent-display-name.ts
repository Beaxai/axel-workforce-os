export interface AgentDisplayNameSource {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  agentFirstName?: string | null;
  agentLastName?: string | null;
  agentPartnerName?: string | null;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Canonical Agent display name.
 *
 * Structured Agent profile names win whenever a profile is present. Legacy
 * partner names remain the fallback for records that do not have a profile.
 */
export function displayName(agent: AgentDisplayNameSource): string {
  const firstName = normalizeName(agent.agentFirstName ?? agent.firstName);
  const lastName = normalizeName(agent.agentLastName ?? agent.lastName);
  const profileName = normalizeName([firstName, lastName].filter(Boolean).join(" "));
  if (profileName) return profileName;

  return (
    normalizeName(agent.agentPartnerName) ||
    normalizeName(agent.name) ||
    "Agent"
  );
}