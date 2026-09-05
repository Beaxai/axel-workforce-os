import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADD_PARTNER_CTA_BACKGROUND,
  SOLID_PRIMARY_BUTTON_BACKGROUND,
} from "./button-styles";

describe("Network CTA button styles", () => {
  it("reserves the purple-to-pink gradient for Add Partner", () => {
    assert.equal(
      ADD_PARTNER_CTA_BACKGROUND,
      "linear-gradient(135deg, #7C3AED, #E91E8C)",
    );
  });

  it("keeps other primary actions solid pink", () => {
    assert.equal(SOLID_PRIMARY_BUTTON_BACKGROUND, "#E91E8C");
    assert.notEqual(SOLID_PRIMARY_BUTTON_BACKGROUND, ADD_PARTNER_CTA_BACKGROUND);
  });
});