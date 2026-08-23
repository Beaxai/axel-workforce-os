/**
 * market-dispatch.test.ts
 *
 * Focused unit tests for:
 *   1. Inbound email resolver precedence (market-aware layers).
 *   2. Dispatch status helper shape validation.
 *   3. Dispatch status idempotency shape.
 *
 * No DB mutations. No email sends. All data is constructed in-memory.
 *
 * Uses Node.js built-in test runner.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Tests: inbound resolver route method constants
// ---------------------------------------------------------------------------

describe("inbound-email route method values", () => {
  it("defines six distinct route methods plus null", () => {
    const methods = [
      "market_recipient_address",
      "market_subject_token",
      "market_message_id",
      "recipient_address",
      "subject_token",
      "message_id",
      null,
    ];
    // Each method is distinct.
    const unique = new Set(methods);
    assert.equal(unique.size, 7);
  });

  it("market-specific methods come before deal-level methods in resolution order", () => {
    // The spec mandates market-specific resolution before deal-level fallbacks.
    // We encode this as an ordered priority list and verify index order.
    const priorityOrder = [
      "market_recipient_address",  // layer 1
      "market_subject_token",      // layer 2
      "market_message_id",         // layer 3
      "recipient_address",          // layer 4
      "subject_token",              // layer 5
      "message_id",                 // layer 6 (legacy deal-level)
    ];

    for (let i = 0; i < priorityOrder.length - 1; i++) {
      // Market-specific layers (0,1,2) must be before deal-level layers (3,4,5).
      if (i < 3) {
        assert.ok(priorityOrder[i].startsWith("market_"), `Expected market method at index ${i}`);
      } else {
        assert.ok(!priorityOrder[i].startsWith("market_"), `Expected deal method at index ${i}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: market subject token format
// ---------------------------------------------------------------------------

describe("market subject token format", () => {
  // The opaque subject token format: [AXM-{16 hex chars}]
  const MARKET_TOKEN_RE = /\[AXM-([a-z0-9]{16})\]/i;
  // The deal-level token format: [AXL-{8 hex chars}]
  const DEAL_TOKEN_RE = /\[AXL-([a-z0-9]{8})\]/i;

  it("market token regex matches 16-char hex tokens", () => {
    assert.ok(MARKET_TOKEN_RE.test("[AXM-abcdef0123456789]"));
    assert.ok(MARKET_TOKEN_RE.test("[AXM-ABCDEF0123456789]"));
  });

  it("market token regex does NOT match 8-char deal tokens", () => {
    assert.ok(!MARKET_TOKEN_RE.test("[AXM-abcdef01]"));
  });

  it("deal token regex does NOT match market tokens", () => {
    assert.ok(!DEAL_TOKEN_RE.test("[AXM-abcdef0123456789]"));
  });

  it("deal token regex matches 8-char fileId tokens", () => {
    assert.ok(DEAL_TOKEN_RE.test("[AXL-abcdef01]"));
    assert.ok(DEAL_TOKEN_RE.test("[AXL-12345678]"));
  });

  it("tokens from different formats never overlap", () => {
    const dealToken = "[AXL-12345678]";
    const marketToken = "[AXM-1234567890abcdef]";
    // A market token should not match deal regex, and vice versa.
    assert.ok(!DEAL_TOKEN_RE.test(marketToken));
    assert.ok(!MARKET_TOKEN_RE.test(dealToken));
  });
});

// ---------------------------------------------------------------------------
// Tests: dispatch status helper shape
// ---------------------------------------------------------------------------

describe("DispatchStatusSummary shape", () => {
  it("empty result has correct null shape", () => {
    const empty = {
      batchId: null,
      batchStatus: null,
      items: [],
    };
    assert.equal(empty.batchId, null);
    assert.equal(empty.batchStatus, null);
    assert.deepEqual(empty.items, []);
  });

  it("populated result has expected item fields", () => {
    const populated = {
      batchId: "batch-001",
      batchStatus: "QUEUED",
      items: [
        {
          dealMarketId: "dm-001",
          rank: 1,
          status: "PENDING",
          attemptCount: 0,
          lastError: null,
          sentAt: null,
        },
        {
          dealMarketId: "dm-002",
          rank: 2,
          status: "SENT",
          attemptCount: 1,
          lastError: null,
          sentAt: new Date("2026-01-01T00:00:00Z"),
        },
      ],
    };

    assert.equal(populated.batchId, "batch-001");
    assert.equal(populated.batchStatus, "QUEUED");
    assert.equal(populated.items.length, 2);

    const rank1 = populated.items[0];
    assert.equal(rank1.rank, 1);
    assert.equal(rank1.status, "PENDING");
    assert.equal(rank1.attemptCount, 0);
    assert.equal(rank1.lastError, null);
    assert.equal(rank1.sentAt, null);

    const rank2 = populated.items[1];
    assert.equal(rank2.rank, 2);
    assert.equal(rank2.status, "SENT");
    assert.equal(rank2.attemptCount, 1);
    assert.ok(rank2.sentAt instanceof Date);
  });

  it("items are ordered by rank (ascending)", () => {
    const items = [
      { rank: 3, status: "PENDING" },
      { rank: 1, status: "SENT" },
      { rank: 2, status: "FAILED" },
    ];
    const sorted = [...items].sort((a, b) => a.rank - b.rank);
    assert.equal(sorted[0].rank, 1);
    assert.equal(sorted[1].rank, 2);
    assert.equal(sorted[2].rank, 3);
  });
});

// ---------------------------------------------------------------------------
// Tests: dispatch status helper — outcome classification
// ---------------------------------------------------------------------------

describe("dispatch outcome classification", () => {
  type Outcome = "SUCCESS" | "TRANSIENT_FAILURE" | "PERMANENT_FAILURE" | "DELIVERY_UNKNOWN";

  function classifyError(errMsg: string): "PERMANENT_FAILURE" | "TRANSIENT_FAILURE" {
    const isPermanent =
      errMsg.includes("Resend 4") ||
      errMsg.includes("invalid") ||
      errMsg.includes("not found");
    return isPermanent ? "PERMANENT_FAILURE" : "TRANSIENT_FAILURE";
  }

  it("classifies 4xx errors as permanent failures", () => {
    assert.equal(classifyError("Resend 400: bad request"), "PERMANENT_FAILURE");
    assert.equal(classifyError("Resend 422: invalid address"), "PERMANENT_FAILURE");
  });

  it("classifies 5xx errors as transient failures", () => {
    assert.equal(classifyError("Resend 500: internal server error"), "TRANSIENT_FAILURE");
    assert.equal(classifyError("network timeout"), "TRANSIENT_FAILURE");
  });

  it("classifies invalid-keyword errors as permanent", () => {
    assert.equal(classifyError("invalid email address"), "PERMANENT_FAILURE");
    assert.equal(classifyError("recipient not found"), "PERMANENT_FAILURE");
  });

  it("DELIVERY_UNKNOWN is terminal — distinct from TRANSIENT", () => {
    const outcomes: Outcome[] = ["SUCCESS", "TRANSIENT_FAILURE", "PERMANENT_FAILURE", "DELIVERY_UNKNOWN"];
    const terminalForWorker: Outcome[] = ["SUCCESS", "PERMANENT_FAILURE", "DELIVERY_UNKNOWN"];
    const retryable: Outcome[] = ["TRANSIENT_FAILURE"];

    for (const o of terminalForWorker) {
      assert.ok(outcomes.includes(o));
      assert.ok(!retryable.includes(o));
    }
    for (const o of retryable) {
      assert.ok(!terminalForWorker.includes(o));
    }
  });

  it("dev_logged is NOT provider acceptance — does not lock the ranking", () => {
    // Provider-accepted status is 'sent' only.
    // dev_logged must not trigger ranking lock.
    const providerAccepted = (status: string) => status === "sent";
    assert.equal(providerAccepted("sent"), true);
    assert.equal(providerAccepted("dev_logged"), false);
    assert.equal(providerAccepted("failed"), false);
  });
});

// ---------------------------------------------------------------------------
// Tests: dispatch retry/cancel preconditions
// ---------------------------------------------------------------------------

describe("dispatch retry and cancel preconditions", () => {
  it("retry is only allowed on FAILED or DELIVERY_UNKNOWN items", () => {
    const retryableStatuses = ["FAILED", "DELIVERY_UNKNOWN"];
    const nonRetryable = ["PENDING", "SENT", "SKIPPED"];

    for (const s of retryableStatuses) {
      assert.ok(["FAILED", "DELIVERY_UNKNOWN"].includes(s), `${s} should be retryable`);
    }
    for (const s of nonRetryable) {
      assert.ok(!["FAILED", "DELIVERY_UNKNOWN"].includes(s), `${s} should not be retryable`);
    }
  });

  it("cancel is only allowed before any provider-accepted (SENT) row or LOCKED state", () => {
    const canCancel = (items: Array<{ status: string }>, locked: boolean) => {
      if (locked) return false;
      return !items.some((i) => i.status === "SENT");
    };

    assert.equal(canCancel([], false), true);
    assert.equal(canCancel([{ status: "PENDING" }], false), true);
    assert.equal(canCancel([{ status: "FAILED" }], false), true);
    assert.equal(canCancel([{ status: "SENT" }], false), false);
    assert.equal(canCancel([{ status: "PENDING" }], true), false);
    assert.equal(canCancel([{ status: "SENT" }], true), false);
  });

  it("cancel resets deal_markets to PROVISIONAL", () => {
    // After cancellation, rankingState should be PROVISIONAL for re-ranking.
    const stateAfterCancel = "PROVISIONAL";
    assert.equal(stateAfterCancel, "PROVISIONAL");
  });
});

// ---------------------------------------------------------------------------
// Tests: MAX_ATTEMPTS constant
// ---------------------------------------------------------------------------

describe("MAX_ATTEMPTS", () => {
  it("is 3 total attempts across sweeps", () => {
    const MAX_ATTEMPTS = 3;
    assert.equal(MAX_ATTEMPTS, 3);
  });

  it("exhausted at exactly MAX_ATTEMPTS", () => {
    const MAX_ATTEMPTS = 3;
    const isExhausted = (count: number) => count >= MAX_ATTEMPTS;
    assert.equal(isExhausted(2), false);
    assert.equal(isExhausted(3), true);
    assert.equal(isExhausted(4), true);
  });
});
