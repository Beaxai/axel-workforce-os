import type { AuthUser } from "./auth";

/** CSA/ADMIN authority is deliberately limited to users linked to an Agent. */
export function canManageTargetAvatar(
  viewer: Pick<AuthUser, "id" | "role">,
  targetUserId: string,
  targetIsAgentLinked: boolean,
): boolean {
  if (viewer.id === targetUserId) return true;
  return targetIsAgentLinked && (viewer.role === "ADMIN" || viewer.role === "CSA");
}