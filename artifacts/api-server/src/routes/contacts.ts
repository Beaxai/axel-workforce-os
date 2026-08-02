import { Router, type IRouter, type Request } from "express";
import { db, contactsTable, insertContactSchema, type Contact } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { resolveActor, visibleContactCondition } from "../lib/scope";

const router: IRouter = Router();

/** SEC-1: true when the actor may see this contact. Out-of-scope reads AND
 *  writes 404 like a missing row, so ids can't be probed across tenants. */
async function inScope(req: Request, contact: Contact): Promise<boolean> {
  const actor = await resolveActor(req);
  const scope = await visibleContactCondition(actor);
  if (scope === null) return true;
  const [visible] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(eq(contactsTable.id, contact.id), scope));
  return !!visible;
}

router.get("/", async (req, res) => {
  const actor = await resolveActor(req);
  const scope = await visibleContactCondition(actor);
  const rows = scope
    ? await db.select().from(contactsTable).where(scope)
    : await db.select().from(contactsTable);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [row] = await db.select().from(contactsTable).where(eq(contactsTable.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  if (!(await inScope(req, row))) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.post("/", async (req, res) => {
  const parsed = insertContactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [row] = await db.insert(contactsTable).values(parsed.data).returning();
  return res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = insertContactSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const [existing] = await db.select().from(contactsTable).where(eq(contactsTable.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (!(await inScope(req, existing))) return res.status(404).json({ error: "Not found" });
  const [row] = await db
    .update(contactsTable)
    .set(parsed.data)
    .where(eq(contactsTable.id, req.params.id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/:id", async (req, res) => {
  const [existing] = await db.select().from(contactsTable).where(eq(contactsTable.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (!(await inScope(req, existing))) return res.status(404).json({ error: "Not found" });
  const [row] = await db.delete(contactsTable).where(eq(contactsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ deleted: true });
});

export default router;
