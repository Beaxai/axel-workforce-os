import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { canShowDealEmailApproval, type CorrespondenceCapabilities } from "./types";

const allowed = { market: { canRead: true, canSend: true, canReviewHeld: true } } as CorrespondenceCapabilities;
const denied = { market: { canRead: true, canSend: true, canReviewHeld: false } } as CorrespondenceCapabilities;

describe("deal email approval review", () => {
  it("requires both the current deal/user capability and the ADMIN role", () => {
    assert.equal(canShowDealEmailApproval("ADMIN", "deal-a:admin:ADMIN", "deal-a:admin:ADMIN", allowed), true);
    assert.equal(canShowDealEmailApproval("CSA", "deal-a:csa:CSA", "deal-a:csa:CSA", allowed), false);
    assert.equal(canShowDealEmailApproval("ADMIN", "deal-a:admin:ADMIN", "deal-b:admin:ADMIN", allowed), false);
    assert.equal(canShowDealEmailApproval("ADMIN", "deal-a:admin:ADMIN", "deal-a:other:ADMIN", allowed), false);
    assert.equal(canShowDealEmailApproval("ADMIN", "deal-a:admin:ADMIN", "deal-a:admin:ADMIN", denied), false);
    assert.equal(canShowDealEmailApproval("ADMIN", undefined, "deal-a:admin:ADMIN", null), false);
  });

  it("does not offer a sidebar link while preserving the direct route", () => {
    const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source("../AppShell.tsx"), /held-mail|Held Mail/);
    assert.doesNotMatch(source("../AppLayout.tsx"), /held-mail|Held Mail/);
    assert.match(source("../../App.tsx"), /path="\/held-mail"/);
  });
});