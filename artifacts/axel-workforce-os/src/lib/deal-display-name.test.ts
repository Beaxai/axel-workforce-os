import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dealDisplayName } from "./deal-display-name";

describe("dealDisplayName", () => {
  it("prefers account names before deal names and reference codes", () => {
    assert.equal(
      dealDisplayName({
        accountBusinessName: "Account LLC",
        businessName: "Deal DBA",
        referenceCode: "DEAL-001",
      }),
      "Account LLC",
    );
    assert.equal(
      dealDisplayName({
        account: { businessName: "Nested Account LLC" },
        clientName: "Legacy Client",
        businessName: "Deal DBA",
      }),
      "Nested Account LLC",
    );
  });

  it("falls back through legacy client, deal name, reference, and untitled", () => {
    assert.equal(dealDisplayName({ clientName: "Legacy Client" }), "Legacy Client");
    assert.equal(dealDisplayName({ businessName: "Deal DBA" }), "Deal DBA");
    assert.equal(dealDisplayName({ referenceCode: "DEAL-002" }), "DEAL-002");
    assert.equal(dealDisplayName({ businessName: "  ", referenceCode: "" }), "Untitled deal");
  });
});