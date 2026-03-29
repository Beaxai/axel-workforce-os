import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";

export const employeesTable = pgTable("employees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").references(() => organizationsTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  hireDate: date("hire_date"),
  terminationDate: date("termination_date"),
  status: text("status").default("ACTIVE"),
  jobTitle: text("job_title"),
  department: text("department"),
  wcClassCode: text("wc_class_code"),
  state: text("state"),
  payType: text("pay_type"),
  payRate: numeric("pay_rate", { precision: 18, scale: 2 }),
  ytdEarnings: numeric("ytd_earnings", { precision: 18, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
