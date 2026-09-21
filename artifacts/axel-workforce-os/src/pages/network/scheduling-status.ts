import type { ProducerSchedulingActionResult } from "@workspace/api-client-react";

type Result = Omit<ProducerSchedulingActionResult, "reason"> & {
  reason?: string | null;
};

/** Polling must supersede the original queued POST response in the callout. */
export function resolveSchedulingResult(
  result: Result | null,
  notifications: Array<{ id: string; status: string; failureCode?: string | null }>,
): Result | null {
  if (!result) return null;
  const current = notifications.find((item) => item.id === result.notificationId);
  if (!current || !["blocked", "pending", "sending", "sent", "failed"].includes(current.status)) {
    return result;
  }
  return {
    ...result,
    status: current.status as Result["status"],
    reason: current.failureCode ?? null,
  };
}