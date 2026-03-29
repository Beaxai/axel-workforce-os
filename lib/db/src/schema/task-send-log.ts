import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tasksTable } from "./tasks";
import { dealsTable } from "./deals";
import { usersTable } from "./users";

export const taskSendLogTable = pgTable("task_send_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").references(() => tasksTable.id),
  dealId: uuid("deal_id").references(() => dealsTable.id),
  sentToEmail: text("sent_to_email"),
  sentToPhone: text("sent_to_phone"),
  deliveryMethod: text("delivery_method").notNull(),
  sentBy: uuid("sent_by").references(() => usersTable.id),
  sentAt: timestamp("sent_at", { withTimezone: true }).default(sql`now()`),
  messageBody: text("message_body"),
});
