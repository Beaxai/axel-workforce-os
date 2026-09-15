import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasControlledEnvelopeShape } from "../lib/correspondence-envelope.js";

describe("controlled correspondence envelope invariants", () => {
  it("rejects mixed audience and hidden-recipient market envelopes", () => {
    assert.equal(hasControlledEnvelopeShape({
      channel: "MARKET", dealMarketId: "market", to: ["market@example.test"], cc: ["broker@example.test"],
    }), false);
    assert.equal(hasControlledEnvelopeShape({
      channel: "MARKET", dealMarketId: "market", to: ["market@example.test"], bcc: ["broker@example.test"],
    }), false);
  });

  it("rejects a market identity in a broker envelope", () => {
    assert.equal(hasControlledEnvelopeShape({
      channel: "BROKER", dealMarketId: "market", recipientUserId: "agent", to: ["agent@example.test"],
    }), false);
  });
});
