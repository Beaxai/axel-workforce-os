import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { dealsTable } from "./deals";

export const CONTACT_ENTITY_TYPES = [
  "client",
  "agency",
  "carrier",
  "peo_partner",
  "vendor",
] as const;

export const CONTACT_ROLES = {
  client: ["decision_maker", "day_to_day", "billing", "claims", "other"],
  carrier: [
    "underwriter",
    "customer_service",
    "accounting",
    "claims",
    "appointments_licensing",
    "other",
  ],
  peo_partner: [
    "implementation",
    "payroll_ops",
    "benefits",
    "risk_claims",
    "accounting",
    "relationship_manager",
    "other",
  ],
  vendor: ["account_manager", "support", "billing", "other"],
  agency: ["office_manager", "accounting", "licensing", "other"],
} as const satisfies Record<
  (typeof CONTACT_ENTITY_TYPES)[number],
  readonly string[]
>;

export const contactsTable = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id").references(() => organizationsTable.id),
    dealId: uuid("deal_id").references(() => dealsTable.id),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    mobile: text("mobile"),
    title: text("title"),
    role: text("role"),
    isPrimary: boolean("is_primary").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`,
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "contacts_entity_type_check",
      sql`${table.entityType} is null or ${table.entityType} in ('client', 'agency', 'carrier', 'peo_partner', 'vendor')`,
    ),
    uniqueIndex("contacts_one_primary_per_entity")
      .on(table.entityType, table.entityId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

export const insertContactSchema = createInsertSchema(contactsTable)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ email: z.email().nullable().optional() });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
