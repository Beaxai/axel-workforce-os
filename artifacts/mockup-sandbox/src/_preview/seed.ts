/**
 * Synchronously seeds the Zustand auth store with a mock user.
 * Call at module-level (outside the component function) in every
 * page-map mockup file so the store is populated before first render.
 */
import { useAuthStore } from "@/lib/auth-store";
import type { PartyRole } from "@/lib/auth-store";

const NAMES: Record<PartyRole, [string, string, string]> = {
  ADMIN:       ["Brendan",  "Walsh",  "brendan@axelwfos.com"],
  AGENT:       ["Maya",     "Torres", "maya@brokerage.com"],
  UNDERWRITER: ["James",    "Chen",   "james@axelwfos.com"],
  CSA:         ["Priya",    "Nair",   "priya@axelwfos.com"],
  EMPLOYER:    ["Alex",     "Kim",    "alex@contoso.com"],
  CARRIER:     ["Diana",    "Lopez",  "diana@carrier.com"],
  PEO:         ["Sam",      "Rivera", "sam@peo.com"],
  VENDOR:      ["Robin",    "Park",   "robin@vendor.com"],
};

export function seedAuth(role: PartyRole = "ADMIN") {
  const [firstName, lastName, email] = NAMES[role];
  useAuthStore.setState({
    user: { id: `preview-${role.toLowerCase()}`, email, firstName, lastName, role },
    isAuthenticated: true,
    hydrated: true,
  });
}
