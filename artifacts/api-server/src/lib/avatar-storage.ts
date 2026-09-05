import { randomBytes } from "node:crypto";
import type { File } from "@google-cloud/storage";
import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const FINAL_PREFIX = "avatars";
const SERVING_PREFIX = "/api/users/avatar/";

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function privateLocation(): { bucketName: string; baseDir: string } {
  const configured = process.env.PRIVATE_OBJECT_DIR?.trim();
  if (!configured) throw new Error("PRIVATE_OBJECT_DIR is not configured");
  const parts = configured.replace(/^\/+|\/+$/g, "").split("/");
  if (!parts[0]) throw new Error("PRIVATE_OBJECT_DIR is invalid");
  return { bucketName: parts[0], baseDir: parts.slice(1).join("/") };
}

function objectName(relativePath: string): string {
  const { baseDir } = privateLocation();
  return [baseDir, relativePath].filter(Boolean).join("/");
}

function fileFor(relativePath: string): File {
  const { bucketName } = privateLocation();
  return storage.bucket(bucketName).file(objectName(relativePath));
}

function opaqueKey(): string {
  return randomBytes(32).toString("hex");
}

export async function writeFinalAvatar(bytes: Buffer): Promise<{ avatarUrl: string; file: File }> {
  const key = opaqueKey();
  const file = fileFor(`${FINAL_PREFIX}/${key}.webp`);
  await file.save(bytes, {
    resumable: false,
    metadata: {
      contentType: "image/webp",
      cacheControl: "private, max-age=86400",
    },
  });
  return { avatarUrl: `${SERVING_PREFIX}${key}`, file };
}

export function managedAvatarFile(avatarUrl: string | null | undefined): File | null {
  if (!avatarUrl?.startsWith(SERVING_PREFIX)) return null;
  const key = avatarUrl.slice(SERVING_PREFIX.length);
  if (!/^[a-f0-9]{64}$/.test(key)) return null;
  return fileFor(`${FINAL_PREFIX}/${key}.webp`);
}

export function servedAvatarFile(key: string): File | null {
  if (!/^[a-f0-9]{64}$/.test(key)) return null;
  return fileFor(`${FINAL_PREFIX}/${key}.webp`);
}

export async function deleteAvatarFile(file: File | null): Promise<void> {
  if (file) await file.delete({ ignoreNotFound: true });
}
