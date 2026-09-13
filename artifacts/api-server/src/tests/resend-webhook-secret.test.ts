import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectResendWebhookSecret } from "../lib/resend-webhook-secret.js";

describe("Resend webhook environment isolation", () => {
  const secrets = {
    RESEND_DEV_WEBHOOK_SECRET: "test-development-only",
    RESEND_WEBHOOK_SECRET: "test-published-only",
  };
  it("uses the dedicated secret in Development", () => {
    assert.equal(selectResendWebhookSecret({ ...secrets, NODE_ENV: "development" }), secrets.RESEND_DEV_WEBHOOK_SECRET);
  });
  it("never uses the Development secret outside Development", () => {
    for (const NODE_ENV of ["production", "test", undefined]) {
      assert.equal(selectResendWebhookSecret({ ...secrets, NODE_ENV }), secrets.RESEND_WEBHOOK_SECRET);
      assert.equal(selectResendWebhookSecret({ NODE_ENV, RESEND_DEV_WEBHOOK_SECRET: secrets.RESEND_DEV_WEBHOOK_SECRET }), undefined);
    }
  });
  it("preserves existing Development configuration when no override exists", () => {
    assert.equal(selectResendWebhookSecret({ NODE_ENV: "development", RESEND_WEBHOOK_SECRET: secrets.RESEND_WEBHOOK_SECRET }), secrets.RESEND_WEBHOOK_SECRET);
  });
});