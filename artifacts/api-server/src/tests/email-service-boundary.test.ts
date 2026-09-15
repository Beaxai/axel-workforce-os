/**
 * Provider-free boundary tests for controlled outbound mail. These exercise
 * the policy gate before any database or Resend I/O is attempted.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyOutboundEmail,
  manualComposeIdempotencyKey,
  validateOutboundEnvelope,
  type SendDealEmailInput,
} from "../services/emailService.js";

const marketInput: SendDealEmailInput = {
  dealId: "deal",
  dealMarketId: "deal-market",
  to: ["market@example.test"],
  subject: "Submission",
  text: "Please review.",
};

const brokerInput: SendDealEmailInput = {
  channel: "BROKER",
  dealId: "deal",
  recipientUserId: "agent",
  to: ["agent@example.test"],
  subject: "Broker update",
  text: "Private broker update.",
};

describe("email service final outbound boundary", () => {
  it("infers MARKET from a deal-market identity instead of accepting a channel-less bypass", () => {
    assert.equal(classifyOutboundEmail(marketInput), "MARKET");
    assert.equal(validateOutboundEnvelope(marketInput), "MARKET");
    assert.throws(
      () => classifyOutboundEmail({ ...marketInput, channel: "BROKER", recipientUserId: "agent" }),
      /MARKET_CHANNEL_REQUIRED/,
    );
    assert.throws(
      () => classifyOutboundEmail({ dealId: "deal", to: ["anyone@example.test"], subject: "No scope", text: "No scope" }),
      /CORRESPONDENCE_CHANNEL_REQUIRED/,
    );
  });

  it("allows only a named system-notice scope outside controlled channels", () => {
    assert.equal(
      validateOutboundEnvelope({
        dealId: "deal",
        to: ["notice@example.test"],
        subject: "Fee notice",
        text: "A system notice.",
        systemNotice: "BROKER_FEE_DUNNING",
      }),
      "SYSTEM_NOTICE",
    );
    assert.throws(
      () => validateOutboundEnvelope({
        dealId: "deal",
        to: ["notice@example.test"],
        subject: "Fee notice",
        text: "A system notice.",
        systemNotice: "BROKER_FEE_DUNNING",
        cc: ["other@example.test"],
      }),
      /SYSTEM_NOTICE_RECIPIENT_POLICY_REJECTED/,
    );
  });

  it("rejects broker attachments, market route material, and incompatible market identity", () => {
    assert.throws(
      () => validateOutboundEnvelope({
        ...brokerInput,
        attachments: [{ filename: "submission.pdf", content: "base64-content" }],
      }),
      /BROKER_ROUTING_POLICY_REJECTED/,
    );
    assert.throws(
      () => validateOutboundEnvelope({
        ...brokerInput,
        text: "Forwarded chain [AXM-private-market-token]",
      }),
      /BROKER_ROUTING_POLICY_REJECTED/,
    );
    assert.throws(
      () => validateOutboundEnvelope({
        ...brokerInput,
        subject: "Re: message-id: <market@example.test>",
      }),
      /BROKER_ROUTING_POLICY_REJECTED/,
    );
    assert.throws(
      () => validateOutboundEnvelope({
        ...brokerInput,
        text: "> From: market@example.test\n> Subject: submission",
      }),
      /BROKER_ROUTING_POLICY_REJECTED/,
    );
    assert.throws(
      () => validateOutboundEnvelope({
        ...brokerInput,
        headers: { "Message-ID": "<spoofed@example.test>" },
      } as SendDealEmailInput),
      /BROKER_ROUTING_POLICY_REJECTED/,
    );
    assert.throws(
      () => validateOutboundEnvelope({ ...brokerInput, dealMarketId: "deal-market" }),
      /MARKET_CHANNEL_REQUIRED/,
    );
  });

  it("requires exactly one recipient and no hidden audience for every controlled send", () => {
    assert.throws(
      () => validateOutboundEnvelope({ ...marketInput, cc: ["broker@example.test"] }),
      /MARKET_RECIPIENT_POLICY_REJECTED/,
    );
    assert.throws(
      () => validateOutboundEnvelope({ ...brokerInput, bcc: ["market@example.test"] }),
      /BROKER_RECIPIENT_POLICY_REJECTED/,
    );
  });

  it("uses a client compose UUID for retry, without content-hashing future messages", () => {
    const requestId = "a0f04a5e-9c4e-4f8b-861e-49985c1b9a7d";
    assert.equal(
      manualComposeIdempotencyKey(requestId),
      `manual-${requestId}`,
    );
    assert.notEqual(
      manualComposeIdempotencyKey(),
      manualComposeIdempotencyKey(),
    );
    assert.throws(
      () => manualComposeIdempotencyKey("not-a-uuid"),
      /INVALID_COMPOSE_REQUEST_ID/,
    );
    assert.throws(
      () => validateOutboundEnvelope({
        ...marketInput,
        idempotencyKey: "manual-not-a-uuid",
      }),
      /INVALID_COMPOSE_REQUEST_ID/,
    );
  });
});