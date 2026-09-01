import { Router, type IRouter } from "express";
import { db, contactsTable, insertContactSchema } from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(contactsTable);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(contactsTable).where(eq(contactsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertContactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
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
  const [row] = await db.delete(contactsTable).where(eq(contactsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
