import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isActiveAgentAgencyAssociation } from "../lib/agent-assignment-gate.js";

describe("producing-agent attachment status gate", () => {
  it("allows only active agents at active agencies", () => {
    assert.equal(isActiveAgentAgencyAssociation("Active", "active"), true);
    assert.equal(isActiveAgentAgencyAssociation("active", "ACTIVE"), true);
    assert.equal(isActiveAgentAgencyAssociation("Suspended", "active"), false);
    assert.equal(isActiveAgentAgencyAssociation("Active", "suspended"), false);
    assert.equal(isActiveAgentAgencyAssociation("Terminated", "terminated"), false);
  });
});