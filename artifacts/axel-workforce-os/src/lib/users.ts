export interface PlaceholderUser {
  id: string;
  name: string;
  avatarUrl: string;
}

export const PLACEHOLDER_USERS: PlaceholderUser[] = [
  { id: "u1", name: "Alex Morgan",  avatarUrl: "https://i.pravatar.cc/96?img=15" },
  { id: "u2", name: "Sarah Chen",   avatarUrl: "https://i.pravatar.cc/96?img=47" },
  { id: "u3", name: "James Rivera", avatarUrl: "https://i.pravatar.cc/96?img=12" },
  { id: "u4", name: "Priya Patel",  avatarUrl: "https://i.pravatar.cc/96?img=44" },
];

export const CURRENT_USER: PlaceholderUser = PLACEHOLDER_USERS[0];

export function getUserById(id?: string | null): PlaceholderUser | undefined {
  if (!id) return undefined;
  return PLACEHOLDER_USERS.find((u) => u.id === id);
}

export function getUserByName(name?: string | null): PlaceholderUser | undefined {
  if (!name) return undefined;
  return PLACEHOLDER_USERS.find((u) => u.name === name);
}

export function resolveActor(
  createdBy?: string | null,
  metadata?: Record<string, unknown> | null,
): PlaceholderUser | undefined {
  const meta = metadata || {};
  const userId = typeof meta.userId === "string" ? meta.userId : undefined;
  const userName = typeof meta.userName === "string" ? meta.userName : undefined;
  return getUserById(userId) || getUserByName(userName) || getUserById(createdBy);
}
