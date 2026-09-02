import sharp from "sharp";

export const MAX_AVATAR_SOURCE_BYTES = 5 * 1024 * 1024;
export const MAX_AVATAR_INPUT_PIXELS = 40_000_000;
export const MAX_AVATAR_INPUT_DIMENSION = 12_000;
export const MAX_AVATAR_OUTPUT_DIMENSION = 512;

export type AvatarSourceFormat = "png" | "jpeg" | "webp";

export class InvalidAvatarImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAvatarImageError";
  }
}

/** Detect only the three accepted raster formats from their actual signatures. */
export function detectAvatarSourceFormat(bytes: Uint8Array): AvatarSourceFormat | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/**
 * Fully decodes and normalizes an avatar. Re-encoding as WebP strips source
 * metadata and ensures source bytes are never served back to a browser.
 */
export async function processAvatarImage(source: Buffer): Promise<Buffer> {
  if (source.length === 0 || source.length > MAX_AVATAR_SOURCE_BYTES) {
    throw new InvalidAvatarImageError("Avatar source must be no larger than 5 MB");
  }
  if (!detectAvatarSourceFormat(source)) {
    throw new InvalidAvatarImageError("Only PNG, JPEG, and WebP images are accepted");
  }

  try {
    const decoder = sharp(source, {
      failOn: "error",
      limitInputPixels: MAX_AVATAR_INPUT_PIXELS,
      pages: 1,
      sequentialRead: true,
    });
    const metadata = await decoder.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_AVATAR_INPUT_DIMENSION ||
      metadata.height > MAX_AVATAR_INPUT_DIMENSION ||
      metadata.width * metadata.height > MAX_AVATAR_INPUT_PIXELS
    ) {
      throw new InvalidAvatarImageError("Avatar dimensions are too large or invalid");
    }

    return await decoder
      .rotate()
      .resize({
        width: MAX_AVATAR_OUTPUT_DIMENSION,
        height: MAX_AVATAR_OUTPUT_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
  } catch (error) {
    if (error instanceof InvalidAvatarImageError) throw error;
    throw new InvalidAvatarImageError("Image could not be decoded safely");
  }
}