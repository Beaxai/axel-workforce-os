import { sql } from "drizzle-orm";
import {
  check,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agenciesTable = pgTable(
  "agencies",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    legalName: text("legal_name").notNull(),
    dba: text("dba"),
    status: text("status").notNull().default("pending"),
    mainPhone: text("main_phone"),
    website: text("website"),
    address: text("address"),
    agencyNpn: text("agency_npn"),
    statesLicensed: jsonb("states_licensed"),
    linesOfAuthority: jsonb("lines_of_authority"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "agencies_status_check",
      sql`${table.status} in ('pending', 'active', 'suspended', 'terminated')`,
    ),
    uniqueIndex("agencies_legal_name_normalized_unique").on(
      sql`lower(regexp_replace(trim(${table.legalName}), '[^a-zA-Z0-9]+', '', 'g'))`,
    ),
  ],
);

export const insertAgencySchema = createInsertSchema(agenciesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgency = z.infer<typeof insertAgencySchema>;
export type Agency = typeof agenciesTable.$inferSelect;