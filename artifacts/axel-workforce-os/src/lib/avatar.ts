export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const ACCEPTED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""}`.toUpperCase();
}

export function validateAvatarFile(file: Pick<File, "type" | "size">): string | null {
  if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
    return "Choose a PNG, JPEG, or WebP image. SVG files are not supported.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Profile images must be 5 MB or smaller.";
  }
  return null;
}
