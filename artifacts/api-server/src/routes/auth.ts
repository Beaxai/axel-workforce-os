import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  orgMembersTable,
  userCredentialsTable,
  passwordResetTokensTable,
  userProfilesTable,
} from "@workspace/db";
import {
  PARTY_ROLES,
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  revokeSession,
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
  findUserByEmail,
  getCredentialByUserId,
  getAuthUserById,
  generateToken,
  hashToken,
  type AuthUser,
} from "../lib/auth";
import { requireAuth, requireRoles } from "../middleware/require-auth";

const router: IRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(PARTY_ROLES),
  orgId: z.string().uuid().optional(),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

function clientMeta(req: import("express").Request) {
  return {
    ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }
  const user = await findUserByEmail(parsed.data.email);
  const cred = user ? await getCredentialByUserId(user.id) : null;
  // Always run one bcrypt compare (dummy hash when no credential) so the
  // response time does not reveal whether the email exists.
  const passwordOk = await verifyPassword(
    parsed.data.password,
    cred?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!user || !cred || !passwordOk) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  // Status gate (Phase 4B): only `active` users may establish a session.
  // `invited` accounts must complete the invite/reset flow first; `deactivated`
  // accounts are blocked while their history is preserved. Checked AFTER the
  // password compare so account status can't be probed by an attacker.
  if (user.status !== "active") {
    res.status(403).json({ error: "Your account is not active. Please contact an administrator." });
    return;
  }
  const authUser = await getAuthUserById(user.id);
  if (!authUser) {
    res.status(403).json({ error: "User has no assigned role" });
    return;
  }
  // Stamp last login (Phase 4B). Upsert so users without a profile row still record it.
  await db
    .insert(userProfilesTable)
    .values({ userId: user.id, lastLoginAt: new Date() })
    .onConflictDoUpdate({ target: userProfilesTable.userId, set: { lastLoginAt: new Date() } });
  const { token } = await createSession(user.id, clientMeta(req));
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  res.json({ user: authUser });
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const token = (req as typeof req & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  await revokeSession(token);
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(0), maxAge: undefined });
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user as AuthUser });
});

// POST /api/auth/register (ADMIN-only invite)
router.post("/register", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const { email, password, firstName, lastName, role, orgId } = parsed.data;
  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: "A user with that email already exists" });
    return;
  }
  const [user] = await db
    .insert(usersTable)
    .values({ email: email.toLowerCase().trim(), firstName, lastName, status: "active" })
    .returning();
  const passwordHash = await hashPassword(password);
  await db.insert(userCredentialsTable).values({ userId: user.id, passwordHash });
  await db.insert(orgMembersTable).values({
    userId: user.id,
    orgId: orgId ?? null,
    role,
    isPrimaryOrg: true,
  });
  const authUser = await getAuthUserById(user.id);
  res.status(201).json({ user: authUser });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  // Always return success to avoid account enumeration.
  if (parsed.success) {
    const user = await findUserByEmail(parsed.data.email);
    if (user) {
      const { token, tokenHash } = generateToken();
      await db.insert(passwordResetTokensTable).values({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      });
      // Stub: email delivery is not configured. Surface the raw token via
      // logs in development only — never in production, where it would be a
      // credential leak. Production always logs the opaque user id only.
      if (process.env.NODE_ENV !== "production") {
        req.log?.info(
          { userId: user.id, resetToken: token },
          "Password reset requested (dev: email delivery stubbed)",
        );
      } else {
        req.log?.info(
          { userId: user.id },
          "Password reset requested (email delivery not configured)",
        );
      }
    }
  }
  res.json({ ok: true });
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid token or password" });
    return;
  }
  const tokenHash = hashToken(parsed.data.token);
  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        gt(passwordResetTokensTable.expiresAt, new Date()),
        isNull(passwordResetTokensTable.usedAt),
      ),
    );
  if (!row) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const existingCred = await getCredentialByUserId(row.userId);
  if (existingCred) {
    await db
      .update(userCredentialsTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(userCredentialsTable.userId, row.userId));
  } else {
    await db.insert(userCredentialsTable).values({ userId: row.userId, passwordHash });
  }
  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, row.id));
  // Completing a reset is the documented way an `invited` account becomes
  // login-eligible. Promote invited → active (never override `deactivated`,
  // which must stay blocked until an admin reactivates).
  await db
    .update(usersTable)
    .set({ status: "active" })
    .where(and(eq(usersTable.id, row.userId), eq(usersTable.status, "invited")));
  res.json({ ok: true });
});

export default router;
