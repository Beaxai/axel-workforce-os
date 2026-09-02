import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import { canManageTargetAvatar } from "../lib/avatar-auth.js";
import { projectLinkedUserAvatar } from "../lib/avatar-projection.js";
import {
  AvatarUploadLimiter,
  attachAvatarUploadRelease,
  avatarUploadErrorMessage,
} from "../lib/avatar-upload.js";

describe("avatar authorization", () => {
  it("allows self-management without broadening generic profile writes", () => {
    assert.equal(canManageTargetAvatar({ id: "self", role: "AGENT" }, "self", true), true);
    assert.equal(canManageTargetAvatar({ id: "self", role: "EMPLOYER" }, "self", false), true);
  });

  it("allows ADMIN and CSA only for another Agent-linked user", () => {
    assert.equal(canManageTargetAvatar({ id: "admin", role: "ADMIN" }, "target", true), true);
    assert.equal(canManageTargetAvatar({ id: "csa", role: "CSA" }, "target", true), true);
    assert.equal(canManageTargetAvatar({ id: "admin", role: "ADMIN" }, "target", false), false);
    assert.equal(canManageTargetAvatar({ id: "agent", role: "AGENT" }, "target", true), false);
  });

  it("maps multer size and one-file errors to clear bad requests", () => {
    assert.equal(avatarUploadErrorMessage({ code: "LIMIT_FILE_SIZE" }), "Avatar source must be no larger than 5 MB");
    assert.equal(avatarUploadErrorMessage({ code: "LIMIT_FILE_COUNT" }), "Upload exactly one avatar file");
    assert.equal(avatarUploadErrorMessage({ code: "LIMIT_UNEXPECTED_FILE" }), "Upload exactly one avatar file");
    assert.equal(avatarUploadErrorMessage({ code: "LIMIT_FIELD_COUNT" }), "Upload exactly one avatar file");
    assert.equal(avatarUploadErrorMessage({ code: "LIMIT_PART_COUNT" }), "Upload exactly one avatar file");
    assert.equal(avatarUploadErrorMessage({ code: "LIMIT_FIELD_VALUE" }), "Upload exactly one avatar file");
    assert.equal(avatarUploadErrorMessage(new Error("unrelated")), null);
  });

  it("enforces per-user rate/concurrency and releases global capacity", () => {
    const limiter = new AvatarUploadLimiter(2, 1_000, 2);
    const first = limiter.tryAcquire("user-a", 100);
    assert.ok(first);
    assert.equal(limiter.tryAcquire("user-a", 100), null, "same user cannot decode concurrently");
    const second = limiter.tryAcquire("user-b", 100);
    assert.ok(second);
    assert.equal(limiter.tryAcquire("user-c", 100), null, "global semaphore is full");
    first!();
    assert.ok(limiter.tryAcquire("user-c", 100), "released global slot is reusable");
    second!();

    const rate = new AvatarUploadLimiter(2, 1_000, 10);
    const one = rate.tryAcquire("rate-user", 100);
    one!();
    const two = rate.tryAcquire("rate-user", 200);
    two!();
    assert.equal(rate.tryAcquire("rate-user", 300), null);
    assert.ok(rate.tryAcquire("rate-user", 1_101), "expired attempt window is pruned");
  });

  it("releases aborted/closed/finished requests once without semaphore drift", () => {
    const limiter = new AvatarUploadLimiter(10, 1_000, 3);
    const requests = ["user-a", "user-b", "user-c"].map((userId) => {
      const req = new EventEmitter();
      const res = new EventEmitter();
      const release = limiter.tryAcquire(userId, 100);
      assert.ok(release);
      attachAvatarUploadRelease(req, res, release!);
      return { req, res };
    });
    assert.equal(limiter.tryAcquire("blocked", 100), null);

    requests[0].req.emit("aborted");
    requests[1].res.emit("close");
    requests[2].res.emit("finish");
    // Simulate overlapping lifecycle events; releases must not double-decrement.
    for (const { req, res } of requests) {
      req.emit("aborted");
      res.emit("close");
      res.emit("finish");
    }

    const nextA = limiter.tryAcquire("user-a", 100);
    const nextB = limiter.tryAcquire("next-b", 100);
    const nextC = limiter.tryAcquire("next-c", 100);
    assert.ok(nextA);
    assert.ok(nextB);
    assert.ok(nextC);
    assert.equal(limiter.tryAcquire("over-capacity", 100), null);
  });
});

describe("Agent avatar projection", () => {
  it("projects the canonical linked-user value and null for unlinked Agents", () => {
    assert.equal(
      projectLinkedUserAvatar({ avatarUrl: "/api/users/avatar/opaque" }),
      "/api/users/avatar/opaque",
    );
    assert.equal(projectLinkedUserAvatar(null), null);
  });
});