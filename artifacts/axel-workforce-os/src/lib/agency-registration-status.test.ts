import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agencyAgreementStatus, agencyEoStatus } from "./agency-registration-status.js";

describe("agency agreement status", () => {
  it("prefers the standing agency agreement fact", () => {
    assert.deepEqual(
      agencyAgreementStatus(
        { agreementSignedAt: "2027-04-15T12:00:00.000Z" },
        { zoomScheduledAt: "2027-04-16T12:00:00.000Z" },
      ),
      { label: "Agreement signed 4/15/2027", color: "green" },
    );
  });

  it("falls back to intake status and then the muted empty state", () => {
    assert.deepEqual(
      agencyAgreementStatus({}, { zoomScheduledAt: "2027-04-16T12:00:00.000Z" }),
      { label: "Call scheduled", color: "yellow" },
    );
    assert.deepEqual(
      agencyAgreementStatus({}, {}),
      { label: "Awaiting signature", color: "yellow" },
    );
    assert.deepEqual(
      agencyAgreementStatus({}, null),
      { label: "No agreement on file", color: "gray" },
    );
  });
});

describe("agency E&O status", () => {
  it("renders current, expired, incomplete, and absent agency facts", () => {
    assert.deepEqual(
      agencyEoStatus({ eoExpirationDate: "2100-12-31" }),
      { label: "E&O current through 12/31/2100", color: "#1EE97B" },
    );
    assert.deepEqual(
      agencyEoStatus({ eoExpirationDate: "2000-01-01" }),
      { label: "E&O expired 1/1/2000", color: "#E91E1E" },
    );
    assert.deepEqual(
      agencyEoStatus({ eoCarrier: "Carrier", eoExpirationDate: null }),
      { label: "E&O on file, no expiration date", color: "#E9C31E" },
    );
    assert.equal(agencyEoStatus({}), null);
  });
});