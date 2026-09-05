import { Router, type IRouter } from "express";
import {
  accountsTable,
  agenciesTable,
  CONTACT_ROLES,
  db,
  contactsTable,
  dealsTable,
  insertContactSchema,
  partnersTable,
} from "@workspace/db";
import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { Request } from "express";

const router: IRouter = Router();
type ContactEntityType = keyof typeof CONTACT_ROLES;

function isContactEntityType(value: unknown): value is ContactEntityType {
  return typeof value === "string" && value in CONTACT_ROLES;
}

async function agentAccountIds(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ accountId: dealsTable.accountId })
    .from(dealsTable)
    .where(or(eq(dealsTable.ownerId, userId), eq(dealsTable.producingAgentId, userId)));
  return rows.map((row) => row.accountId).filter((id): id is string => Boolean(id));
}

async function targetExists(entityType: ContactEntityType, entityId: string): Promise<boolean> {
  if (entityType === "client") {
    return Boolean((await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.id, entityId)).limit(1))[0]);
  }
  if (entityType === "agency") {
    return Boolean((await db.select({ id: agenciesTable.id }).from(agenciesTable).where(eq(agenciesTable.id, entityId)).limit(1))[0]);
  }
  const expectedPartnerType = {
    carrier: "Carrier",
    peo_partner: "PEO",
    vendor: "Vendor",
  }[entityType];
  return Boolean(
    (
      await db
        .select({ id: partnersTable.id })
        .from(partnersTable)
        .where(and(eq(partnersTable.id, entityId), eq(partnersTable.partnerType, expectedPartnerType)))
        .limit(1)
    )[0],
  );
}

async function mayAccessEntity(
  req: Request,
  entityType: ContactEntityType,
  entityId: string,
  mutation: boolean,
): Promise<boolean> {
  const role = req.user?.role;
  if (role === "ADMIN" || role === "CSA") return true;
  if (mutation && role === "UNDERWRITER") return false;
  if (entityType !== "client") return false;
  if (role === "UNDERWRITER") return true;
  if (role !== "AGENT" || !req.user) return false;
  return (await agentAccountIds(req.user.id)).includes(entityId);
}

function roleIsValid(entityType: ContactEntityType, role: unknown): boolean {
  return typeof role === "string" && (CONTACT_ROLES[entityType] as readonly string[]).includes(role);
}

router.get("/roles", (_req, res) => {
  res.json(CONTACT_ROLES);
});

router.get("/", async (req, res) => {
  let query = db.select().from(contactsTable).$dynamic();
  const entityType =
    typeof req.query.entityType === "string"
      ? req.query.entityType
      : undefined;
  const entityId =
    typeof req.query.entityId === "string" ? req.query.entityId : undefined;

  if (entityType || entityId) {
    if (!isContactEntityType(entityType) || !entityId) {
      return res.status(400).json({ error: "entityType and entityId are both required" });
    }
    if (!(await targetExists(entityType, entityId))) return res.status(404).json({ error: "Entity not found" });
    if (!(await mayAccessEntity(req, entityType, entityId, false))) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    query = query.where(
      and(
        eq(contactsTable.entityType, entityType),
        eq(contactsTable.entityId, entityId),
      ),
    );
  } else if (req.user?.role === "AGENT") {
    const ids = await agentAccountIds(req.user.id);
    if (ids.length === 0) return res.json([]);
    query = query.where(and(eq(contactsTable.entityType, "client"), inArray(contactsTable.entityId, ids)));
  } else if (req.user?.role === "UNDERWRITER") {
    query = query.where(eq(contactsTable.entityType, "client"));
  } else if (req.user?.role !== "ADMIN" && req.user?.role !== "CSA") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const rows = await query;
  return res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(contactsTable).where(eq(contactsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  if (!isContactEntityType(row.entityType) || !row.entityId) {
    if (req.user?.role !== "ADMIN" && req.user?.role !== "CSA") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
  } else if (!(await mayAccessEntity(req, row.entityType, row.entityId, false))) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertContactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { entityType, entityId, role, email } = parsed.data;
  if (!isContactEntityType(entityType) || !entityId || !roleIsValid(entityType, role) || !email) {
    return res.status(400).json({ error: "Valid entityType, entityId, email, and entity role are required" });
  }
  if (!(await targetExists(entityType, entityId))) return res.status(404).json({ error: "Entity not found" });
  if (!(await mayAccessEntity(req, entityType, entityId, true))) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const [row] = await db.transaction(async (tx) => {
    if (
      parsed.data.isPrimary &&
      parsed.data.entityType &&
      parsed.data.entityId
    ) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${parsed.data.entityType}:${parsed.data.entityId}`}, 0))`,
      );
      await tx
        .update(contactsTable)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(contactsTable.entityType, parsed.data.entityType),
            eq(contactsTable.entityId, parsed.data.entityId),
            eq(contactsTable.isPrimary, true),
          ),
        );
    }
    return tx.insert(contactsTable).values(parsed.data).returning();
  });
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertContactSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [current] = await db.select().from(contactsTable).where(eq(contactsTable.id, req.params.id));
  if (!current) return res.status(404).json({ error: "Not found" });
  if (!isContactEntityType(current.entityType) || !current.entityId) {
    return res.status(400).json({ error: "Legacy unscoped contacts cannot be changed through this endpoint" });
  }
  if (
    (parsed.data.entityType && parsed.data.entityType !== current.entityType) ||
    (parsed.data.entityId && parsed.data.entityId !== current.entityId)
  ) {
    return res.status(400).json({ error: "Contact ownership cannot be reassigned" });
  }
  const nextRole = parsed.data.role ?? current.role;
  if (!roleIsValid(current.entityType, nextRole)) {
    return res.status(400).json({ error: "Role is not valid for this entity type" });
  }
  if (!(await targetExists(current.entityType, current.entityId))) return res.status(404).json({ error: "Entity not found" });
  if (!(await mayAccessEntity(req, current.entityType, current.entityId, true))) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const [row] = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.id, req.params.id))
      .for("update");
    if (!existing) return [];

    const entityType = parsed.data.entityType ?? existing.entityType;
    const entityId = parsed.data.entityId ?? existing.entityId;
    const isPrimary = parsed.data.isPrimary ?? existing.isPrimary;
    if (isPrimary && entityType && entityId) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${entityType}:${entityId}`}, 0))`,
      );
      await tx
        .update(contactsTable)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(contactsTable.entityType, entityType),
            eq(contactsTable.entityId, entityId),
            eq(contactsTable.isPrimary, true),
            ne(contactsTable.id, req.params.id),
          ),
        );
    }

    return tx
      .update(contactsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(contactsTable.id, req.params.id))
      .returning();
  });
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [current] = await db.select().from(contactsTable).where(eq(contactsTable.id, req.params.id));
  if (!current) return res.status(404).json({ error: "Not found" });
  if (!isContactEntityType(current.entityType) || !current.entityId) {
    return res.status(400).json({ error: "Legacy unscoped contacts cannot be changed through this endpoint" });
  }
  if (!(await mayAccessEntity(req, current.entityType, current.entityId, true))) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  await db.delete(contactsTable).where(eq(contactsTable.id, req.params.id));
  return res.json({ deleted: true });
});

export default router;
