import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  detectAvatarSourceFormat,
  InvalidAvatarImageError,
  processAvatarImage,
} from "../lib/avatar-images.js";

describe("avatar image validation", () => {
  it("recognizes PNG, JPEG, and WebP signatures", () => {
    assert.equal(
      detectAvatarSourceFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      "png",
    );
    assert.equal(detectAvatarSourceFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "jpeg");
    assert.equal(detectAvatarSourceFormat(Buffer.from("RIFF1234WEBP")), "webp");
  });

  it("rejects SVG even when it has an image-like name or declared MIME elsewhere", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>');
    assert.equal(detectAvatarSourceFormat(svg), null);
    await assert.rejects(() => processAvatarImage(svg), InvalidAvatarImageError);
  });

  it("requires a successful decode after signature detection", async () => {
    const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    await assert.rejects(() => processAvatarImage(fakePng), InvalidAvatarImageError);
  });

  it("rejects excessive decoded dimensions even when compressed input is small", async () => {
    const veryWide = await sharp({
      create: {
        width: 12_001,
        height: 1,
        channels: 3,
        background: "#000",
      },
    }).png().toBuffer();
    await assert.rejects(() => processAvatarImage(veryWide), InvalidAvatarImageError);
  });

  it("normalizes metadata-free WebP within 512x512 without enlargement", async () => {
    const source = await sharp({
      create: {
        width: 900,
        height: 600,
        channels: 3,
        background: "#4287f5",
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const output = await processAvatarImage(source);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.ok((metadata.width ?? Infinity) <= 512);
    assert.ok((metadata.height ?? Infinity) <= 512);
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.icc, undefined);

    const small = await sharp({
      create: { width: 32, height: 20, channels: 3, background: "#fff" },
    }).png().toBuffer();
    const smallMetadata = await sharp(await processAvatarImage(small)).metadata();
    assert.equal(smallMetadata.width, 32);
    assert.equal(smallMetadata.height, 20);
  });
});
