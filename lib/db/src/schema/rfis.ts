import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { dealsTable } from "./deals";
import { usersTable } from "./users";

/**
 * Phase 4C / P6 — Request-For-Information items raised on a deal.
 *
 * An RFI is an outstanding question the deal team needs answered before the
 * submission can proceed. A `blocking` RFI that is still `OPEN` hard-blocks the
 * Approve action server-side (see routes/deal-card.ts). `dueAt` drives the live
 * countdown rendered on the Overview tab. `internal` mirrors the activity-log
 * visibility rule so external parties never see internal-only RFIs (§8).
 */
export const dealRfisTable = pgTable("deal_rfis", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => dealsTable.id),
  subject: text("subject").notNull(),
  detail: text("detail"),
  status: text("status").notNull().default("OPEN"), // OPEN | RESOLVED | WAIVED
  blocking: boolean("blocking").notNull().default(true),
  internal: boolean("internal").notNull().default(false),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => usersTable.id),
  createdByName: text("created_by_name"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by").references(() => usersTable.id),
  resolvedByName: text("resolved_by_name"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertDealRfiSchema = createInsertSchema(dealRfisTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDealRfi = z.infer<typeof insertDealRfiSchema>;
export type DealRfi = typeof dealRfisTable.$inferSelect;
