export type EngagementSource = "AXEL_KEEP" | "AUTO_PREFERRED" | "MANUAL_OVERFLOW" | "RATED";
export type EngagementStatus =
  | "AVAILABLE" | "ACTIVE" | "SENT" | "QUOTE_RECEIVED"
  | "DECLINED" | "NO_RESPONSE" | "SELECTED";

export function canCorrespond(
  source: EngagementSource,
  isActive: boolean,
  status: EngagementStatus,
): boolean {
  if (!isActive) return false;
  return source === "AXEL_KEEP"
    ? ["ACTIVE", "QUOTE_RECEIVED", "SELECTED"].includes(status)
    : ["SENT", "QUOTE_RECEIVED", "SELECTED"].includes(status);
}

export function canSelect(
  source: EngagementSource,
  isActive: boolean,
  status: EngagementStatus,
): boolean {
  if (!isActive) return false;
  return source === "AXEL_KEEP"
    ? ["ACTIVE", "QUOTE_RECEIVED"].includes(status)
    : status === "QUOTE_RECEIVED";
}

export function statusAfterDeselection(source: EngagementSource): EngagementStatus {
  return source === "AXEL_KEEP" ? "ACTIVE" : "QUOTE_RECEIVED";
}

export function isCurrentSelection(isSelected: boolean, status: EngagementStatus): boolean {
  return isSelected && status === "SELECTED";
}

export function canManageMarket(role: string): boolean {
  return role === "ADMIN" || role === "UNDERWRITER" || role === "CSA";
}

export function canTransition(
  source: EngagementSource,
  current: EngagementStatus,
  next: EngagementStatus,
): boolean {
  const allowed: Record<string, EngagementStatus[]> = {
    ACTIVE: [],
    SENT: ["QUOTE_RECEIVED", "DECLINED", "NO_RESPONSE"],
    QUOTE_RECEIVED: ["DECLINED", "NO_RESPONSE"],
  };
  if (source === "AXEL_KEEP" && current === "ACTIVE") {
    return ["QUOTE_RECEIVED", "DECLINED", "NO_RESPONSE"].includes(next);
  }
  return allowed[current]?.includes(next) ?? false;
}