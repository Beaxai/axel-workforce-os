import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { avatarInitials, MAX_AVATAR_BYTES, validateAvatarFile } from "./avatar";

describe("avatar helpers", () => {
  it("builds stable first-and-last initials with safe fallbacks", () => {
    assert.equal(avatarInitials("Ada Lovelace"), "AL");
    assert.equal(avatarInitials("  Mary Jane Watson  "), "MW");
    assert.equal(avatarInitials("Prince"), "P");
    assert.equal(avatarInitials(""), "?");
  });

  it("allows supported formats at the size limit", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      assert.equal(validateAvatarFile({ type, size: MAX_AVATAR_BYTES }), null);
    }
  });

  it("rejects SVG, unknown formats, and files over 5 MB", () => {
    assert.match(validateAvatarFile({ type: "image/svg+xml", size: 100 }) ?? "", /SVG/);
    assert.match(validateAvatarFile({ type: "image/gif", size: 100 }) ?? "", /PNG, JPEG, or WebP/);
    assert.match(validateAvatarFile({ type: "image/png", size: MAX_AVATAR_BYTES + 1 }) ?? "", /5 MB/);
  });
});