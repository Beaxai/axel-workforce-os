/** Canonical projection used when an Agent profile has an optional linked user. */
export function projectLinkedUserAvatar(
  linkedUser: { avatarUrl: string | null } | null | undefined,
): string | null {
  return linkedUser?.avatarUrl ?? null;
}