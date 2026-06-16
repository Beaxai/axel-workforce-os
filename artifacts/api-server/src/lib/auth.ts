import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import {
  db,
  usersTable,
  orgMembersTable,
  organizationsTable,
  sessionsTable,
  userCredentialsTable,
} from "@workspace/db";

export const PARTY_ROLES = [
  "ADMIN",
  "UNDERWRITER",
  "CSA",
  "AGENT",
  "EMPLOYER",
  "CARRIER",
  "PEO",
  "VENDOR",
] as const;
export type PartyRole = (typeof PARTY_ROLES)[number];

export const SESSION_COOKIE = "axel_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: PartyRole;
  orgId: string | null;
  orgName: string | null;
}

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** A valid bcrypt hash used to equalize login latency when an account or
 * credential is missing, so attackers can't infer email existence via timing. */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync("axel-timing-equalizer", BCRYPT_ROUNDS);

/** Generate a high-entropy opaque session token (returned to client) plus its
 * SHA-256 hash (the only thing persisted). */
export function generateToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function cookieOptions(maxAgeMs: number = SESSION_TTL_MS) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: maxAgeMs,
  };
}

/** Resolve a user's primary role + org from org_members. Falls back to the
 * first membership, then to ADMIN-less guest (returns null role). */
async function resolveRole(userId: string): Promise<{ role: PartyRole; orgId: string | null; orgName: string | null } | null> {
  const rows = await db
    .select({
      role: orgMembersTable.role,
      orgId: orgMembersTable.orgId,
      isPrimaryOrg: orgMembersTable.isPrimaryOrg,
    })
    .from(orgMembersTable)
    .where(eq(orgMembersTable.userId, userId));
  if (rows.length === 0) return null;
  const primary = rows.find((r) => r.isPrimaryOrg) ?? rows[0];
  const role = (primary.role || "").toUpperCase();
  if (!PARTY_ROLES.includes(role as PartyRole)) return null;
  let orgName: string | null = null;
  if (primary.orgId) {
    const [org] = await db
      .select({ name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, primary.orgId));
    orgName = org?.name ?? null;
  }
  return { role: role as PartyRole, orgId: primary.orgId ?? null, orgName };
}

export async function getAuthUserById(userId: string): Promise<AuthUser | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;
  const roleInfo = await resolveRole(userId);
  if (!roleInfo) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: roleInfo.role,
    orgId: roleInfo.orgId,
    orgName: roleInfo.orgName,
  };
}

/** Validate a raw session token; returns the auth user or null if missing/expired. */
export async function getSessionUser(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.tokenHash, tokenHash), gt(sessionsTable.expiresAt, new Date())));
  if (!session) return null;
  return getAuthUserById(session.userId);
}

export async function createSession(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({
    userId,
    tokenHash,
    expiresAt,
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  });
  return { token, expiresAt };
}

export async function revokeSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, hashToken(token)));
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));
  return user ?? null;
}

export async function getCredentialByUserId(userId: string) {
  const [cred] = await db
    .select()
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, userId));
  return cred ?? null;
}
