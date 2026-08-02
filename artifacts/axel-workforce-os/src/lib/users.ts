import { useMemo } from "react";
import { useGetUsers, type UserSummary } from "@workspace/api-client-react";

export interface TeamMember {
  id: string;
  name: string;
  avatarUrl: string;
  /** Raw headshot URL when the user actually has one; null → render initials. */
  photoUrl: string | null;
}

function displayName(u: UserSummary): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.email;
}

function avatarFor(u: UserSummary): string {
  if (u.avatarUrl) return u.avatarUrl;
  // Deterministic initials-based fallback avatar (no external PII).
  const seed = encodeURIComponent(displayName(u));
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
}

function toTeamMember(u: UserSummary): TeamMember {
  return { id: u.id, name: displayName(u), avatarUrl: avatarFor(u), photoUrl: u.avatarUrl ?? null };
}

/**
 * Live team-member directory backed by GET /api/users.
 * Returns members plus lookup helpers bound to the fetched data.
 */
export function useTeamMembers() {
  const { data, isLoading, isError } = useGetUsers();

  const members = useMemo<TeamMember[]>(
    () => (data ?? []).map(toTeamMember),
    [data]
  );

  const byId = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const byName = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const m of members) map.set(m.name, m);
    return map;
  }, [members]);

  const getById = (id?: string | null): TeamMember | undefined =>
    id ? byId.get(id) : undefined;

  const getByName = (name?: string | null): TeamMember | undefined =>
    name ? byName.get(name) : undefined;

  const resolveActor = (
    createdBy?: string | null,
    metadata?: Record<string, unknown> | null
  ): TeamMember | undefined => {
    const meta = metadata || {};
    const userId = typeof meta.userId === "string" ? meta.userId : undefined;
    const userName = typeof meta.userName === "string" ? meta.userName : undefined;
    return getById(userId) || getByName(userName) || getById(createdBy);
  };

  return { members, isLoading, isError, getById, getByName, resolveActor };
}
