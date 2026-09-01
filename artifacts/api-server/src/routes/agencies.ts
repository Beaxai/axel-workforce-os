import { Router, type IRouter } from "express";
import { agenciesTable, db } from "@workspace/db";
import { asc } from "drizzle-orm";
import { z } from "zod/v4";
import { createOrMatchAgency } from "../lib/agencies";
import { requireRoles } from "../middleware/require-auth";

const router: IRouter = Router();

const createAgencySchema = z.object({
  legalName: z.string().trim().min(1),
  mainPhone: z.string().trim().min(1),
  dba: z.string().trim().optional(),
  website: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(agenciesTable)
    .orderBy(asc(agenciesTable.legalName));
  res.json(rows);
});

router.post("/", requireRoles("ADMIN", "CSA"), async (req, res) => {
  const parsed = createAgencySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const agency = await db.transaction((tx) =>
    createOrMatchAgency(tx, {
      ...parsed.data,
      status: "active",
    }),
  );
  return res.status(201).json(agency);
});

export default router;