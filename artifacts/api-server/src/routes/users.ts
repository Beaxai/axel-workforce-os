import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  usersTable,
  userProfilesTable,
  orgMembersTable,
  activityLogTable,
  insertUserSchema,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRoles } from "../middleware/require-auth";
import {
  PARTY_ROLES,
  getAuthUserById,
  findUserByEmail,
  type AuthUser,
} from "../lib/auth";
import {
  assembleProfile,
  canViewProfile,
  isInternalRole,
} from "../lib/user-profiles";

const router: IRouter = Router();

// Internal staff who may browse the raw user directory + manage users.
const requireInternalSales = requireRoles("ADMIN", "CSA", "AGENT", "UNDERWRITER");
const requireAdmin = requireRoles("ADMIN");

/* ------------------------------------------------------------------ *
 * Directory + admin CRUD (internal / ADMIN only)
 * ------------------------------------------------------------------ */
router.get("/", requireInternalSales, async (_req, res) => {
  const rows = await db.select().from(usersTable);
  // Enrich each row with its primary party role (lives on org_members, not
  // users) so the admin directory can render role badges.
  const memberships = await db
    .select({
      userId: orgMembersTable.userId,
      role: orgMembersTable.role,
      isPrimaryOrg: orgMembersTable.isPrimaryOrg,
    })
    .from(orgMembersTable);
  const roleByUser = new Map<string, string>();
  for (const m of memberships) {
    if (!m.userId || !m.role) continue;
    const existing = roleByUser.get(m.userId);
    if (!existing || m.isPrimaryOrg) roleByUser.set(m.userId, m.role.toUpperCase());
  }
  res.json(rows.map((r) => ({ ...r, role: roleByUser.get(r.id) ?? null })));
});

router.post("/", requireAdmin, async (req, res) => {
  const parsed = insertUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(usersTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

// POST /api/users/invite — ADMIN invite: creates user (invited) + org_members +
// user_profiles atomically. Password is set later via the forgot/reset flow.
const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(PARTY_ROLES),
  orgId: z.string().uuid().optional(),
  title: z.string().optional(),
});

router.post("/invite", requireAdmin, async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { email, firstName, lastName, role, orgId, title } = parsed.data;
  const existing = await findUserByEmail(email);
  if (existing) return res.status(409).json({ error: "A user with that email already exists" });

  const userId = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(usersTable)
      .values({ email: email.toLowerCase().trim(), firstName, lastName, status: "invited" })
      .returning();
    await tx.insert(orgMembersTable).values({
      userId: user.id,
      orgId: orgId ?? null,
      role,
      isPrimaryOrg: true,
    });
    await tx.insert(userProfilesTable).values({ userId: user.id, title: title ?? null });
    return user.id;
  });

  const authUser = await getAuthUserById(userId);
  return res.status(201).json({ user: authUser });
});

/* ------------------------------------------------------------------ *
 * Profile read (any authenticated user; record-level authz inside)
 * ------------------------------------------------------------------ */
router.get("/:id/profile", async (req: Request<{ id: string }>, res: Response) => {
  const viewer = req.user as AuthUser;
  if (!(await canViewProfile(viewer, req.params.id))) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const includeInternal = isInternalRole(viewer.role);
  const payload = await assembleProfile(req.params.id, includeInternal);
  if (!payload) return res.status(404).json({ error: "Not found" });
  return res.json(payload);
});

// GET /api/users/:id/activity — paginated slice of activity_log for events the
// user PERFORMED (created_by). Note: activity_log is deal-scoped, so non-deal
// actions will not appear here.
router.get("/:id/activity", async (req: Request<{ id: string }>, res: Response) => {
  const viewer = req.user as AuthUser;
  if (!(await canViewProfile(viewer, req.params.id))) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const rows = await db
    .select({
      id: activityLogTable.id,
      dealId: activityLogTable.dealId,
      entityType: activityLogTable.entityType,
      eventType: activityLogTable.eventType,
      description: activityLogTable.description,
      createdAt: activityLogTable.createdAt,
    })
    .from(activityLogTable)
    .where(eq(activityLogTable.createdBy, req.params.id))
    .orderBy(desc(activityLogTable.createdAt))
    .limit(limit)
    .offset(offset);
  return res.json({ items: rows, limit, offset });
});

/* ------------------------------------------------------------------ *
 * Profile write (self limited to contact fields; ADMIN full)
 * ------------------------------------------------------------------ */
const profilePatchSchema = z
  .object({
    phone: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    internalNotes: z.string().nullable().optional(),
    roleMetadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// Fields a non-admin self-editor may never touch (enforced server-side, not UI).
const PROTECTED_SELF_FIELDS = ["role", "org", "orgId", "status", "password", "credentials", "email"];

router.patch("/:id/profile", async (req: Request<{ id: string }>, res: Response) => {
  const viewer = req.user as AuthUser;
  const targetId = req.params.id;
  const isAdmin = viewer.role === "ADMIN";
  const isSelf = viewer.id === targetId;
  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  // Reject privileged-field tampering by self-editors before validation.
  if (!isAdmin) {
    const attempted = PROTECTED_SELF_FIELDS.filter((f) => f in req.body);
    if (attempted.length > 0) {
      return res.status(403).json({ error: `Cannot self-edit protected fields: ${attempted.join(", ")}` });
    }
  }
  const parsed = profilePatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  // Self-editors may only change contact fields (phone/mobile) + timezone.
  const data = parsed.data;
  const userUpdate: Record<string, unknown> = {};
  const profileUpdate: Record<string, unknown> = {};
  if (data.phone !== undefined) userUpdate.phone = data.phone;
  if (data.mobile !== undefined) userUpdate.mobile = data.mobile;
  if (data.timezone !== undefined) profileUpdate.timezone = data.timezone;
  if (isAdmin) {
    if (data.title !== undefined) profileUpdate.title = data.title;
    if (data.bio !== undefined) profileUpdate.bio = data.bio;
    if (data.internalNotes !== undefined) profileUpdate.internalNotes = data.internalNotes;
    if (data.roleMetadata !== undefined) profileUpdate.roleMetadata = data.roleMetadata;
  } else if (data.title !== undefined || data.bio !== undefined || data.internalNotes !== undefined || data.roleMetadata !== undefined) {
    return res.status(403).json({ error: "Only contact info and timezone are self-editable" });
  }

  await db.transaction(async (tx) => {
    if (Object.keys(userUpdate).length > 0) {
      await tx.update(usersTable).set(userUpdate).where(eq(usersTable.id, targetId));
    }
    if (Object.keys(profileUpdate).length > 0) {
      await tx
        .insert(userProfilesTable)
        .values({ userId: targetId, ...profileUpdate })
        .onConflictDoUpdate({
          target: userProfilesTable.userId,
          set: { ...profileUpdate, updatedAt: new Date() },
        });
    }
  });

  const includeInternal = isInternalRole(viewer.role);
  const payload = await assembleProfile(targetId, includeInternal);
  if (!payload) return res.status(404).json({ error: "Not found" });
  return res.json(payload);
});

// PATCH /api/users/:id/status — ADMIN deactivate / reactivate (no hard delete).
const statusSchema = z.object({ status: z.enum(["active", "deactivated"]) });

router.patch("/:id/status", requireAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db
    .update(usersTable)
    .set({ status: parsed.data.status })
    .where(eq(usersTable.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

/* ------------------------------------------------------------------ *
 * Raw user record (internal directory) + ADMIN update/delete
 * ------------------------------------------------------------------ */
router.get("/:id", requireInternalSales, async (req: Request<{ id: string }>, res: Response) => {
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.patch("/:id", requireAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const parsed = insertUserSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/:id", requireAdmin, async (req: Request<{ id: string }>, res: Response) => {
  const [row] = await db.delete(usersTable).where(eq(usersTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
