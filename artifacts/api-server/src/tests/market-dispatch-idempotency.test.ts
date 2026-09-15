/**
 * Provider-free key scoping tests. No dispatch worker or network I/O runs.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dispatchAttemptIdempotencyKey } from "../lib/market-dispatch.js";

describe("market dispatch attempt idempotency", () => {
  it("scopes the same market attempt number to its batch and item", () => {
    const first = dispatchAttemptIdempotencyKey("batch-one", "item-one", "market", 1);
    const manualRetry = dispatchAttemptIdempotencyKey("batch-two", "item-two", "market", 1);
    assert.notEqual(first, manualRetry);
    assert.match(first, /^dispatch-batch-one-item-one-market-attempt-1$/);
  });

  it("keeps repeated execution of one batch item on its one stable key", () => {
    assert.equal(
      dispatchAttemptIdempotencyKey("batch", "item", "market", 2),
      dispatchAttemptIdempotencyKey("batch", "item", "market", 2),
    );
  });
});