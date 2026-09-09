import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canCorrespond, canSelect, canTransition, isCurrentSelection, statusAfterDeselection } from "../lib/market-engagement.js";
import { canCancelDispatchBatch } from "../lib/market-dispatch.js";

describe("launch market engagement lifecycle", () => {
  it("rejects AVAILABLE E and pre-keep Axel correspondence", () => {
    assert.equal(canCorrespond("MANUAL_OVERFLOW", false, "AVAILABLE"), false);
    assert.equal(canCorrespond("AXEL_KEEP", false, "AVAILABLE"), false);
  });
  it("requires wholesale delivery before quote or correspondence", () => {
    assert.equal(canTransition("MANUAL_OVERFLOW", "ACTIVE", "QUOTE_RECEIVED"), false);
    assert.equal(canTransition("MANUAL_OVERFLOW", "ACTIVE", "DECLINED"), false);
    assert.equal(canTransition("MANUAL_OVERFLOW", "ACTIVE", "NO_RESPONSE"), false);
    assert.equal(canCorrespond("MANUAL_OVERFLOW", true, "ACTIVE"), false);
    assert.equal(canSelect("MANUAL_OVERFLOW", true, "SENT"), false);
    assert.equal(canSelect("MANUAL_OVERFLOW", true, "QUOTE_RECEIVED"), true);
  });
  it("allows an active kept Axel engagement to be selected", () => {
    assert.equal(canCorrespond("AXEL_KEEP", true, "ACTIVE"), true);
    assert.equal(canSelect("AXEL_KEEP", true, "ACTIVE"), true);
  });
  it("keeps repeated selection idempotent and restores switched lifecycle", () => {
    assert.equal(isCurrentSelection(true, "SELECTED"), true);
    assert.equal(isCurrentSelection(false, "SELECTED"), false);
    assert.equal(statusAfterDeselection("MANUAL_OVERFLOW"), "QUOTE_RECEIVED");
    assert.equal(statusAfterDeselection("AXEL_KEEP"), "ACTIVE");
  });
  it("rejects launch cancellation but preserves legacy rated cancellation", () => {
    assert.equal(canCancelDispatchBatch(true), false);
    assert.equal(canCancelDispatchBatch(false), true);
  });
});