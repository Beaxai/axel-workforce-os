import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSchedulingResult } from "./scheduling-status";

const queued = {
  status: "pending" as const, reason: null, actionId: "action", intent: "resend" as const,
  notificationId: "notification", replayed: false,
};

test("polled provider acceptance replaces queued callout without another POST", () => {
  assert.equal(resolveSchedulingResult(queued, [
    { id: "notification", status: "sent", failureCode: null },
  ])?.status, "sent");
});

test("polled failure replaces queued callout with its safe reason", () => {
  const result = resolveSchedulingResult(queued, [
    { id: "notification", status: "failed", failureCode: "DELIVERY_UNKNOWN" },
  ]);
  assert.equal(result?.status, "failed");
  assert.equal(result?.reason, "DELIVERY_UNKNOWN");
});

test("unrelated notifications do not overwrite a request; reopen needs no action callout", () => {
  assert.equal(resolveSchedulingResult(queued, [{ id: "other", status: "sent" }]), queued);
  assert.equal(resolveSchedulingResult(null, [{ id: "notification", status: "sent" }]), null);
});