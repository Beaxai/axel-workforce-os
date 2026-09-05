import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fillAgencyFieldIfEmpty } from "../lib/agencies.js";

describe("agency registration enrichment", () => {
  it("fills null, blank, and empty-array agency fields", () => {
    assert.equal(fillAgencyFieldIfEmpty(null, "Registration value"), "Registration value");
    assert.equal(fillAgencyFieldIfEmpty("  ", "Registration value"), "Registration value");
    assert.deepEqual(fillAgencyFieldIfEmpty([], ["CA", "NV"]), ["CA", "NV"]);
  });

  it("never overwrites populated agency fields", () => {
    assert.equal(fillAgencyFieldIfEmpty("Saved value", "Registration value"), "Saved value");
    assert.deepEqual(fillAgencyFieldIfEmpty(["TX"], ["CA", "NV"]), ["TX"]);
  });
});