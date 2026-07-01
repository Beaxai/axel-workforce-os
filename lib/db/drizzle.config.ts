import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Exclude orphan tables that are intentionally not modeled in the Drizzle
  // schema so push never introspects or drops them. `rates_backup_20260610`
  // is a manual backup snapshot (24,820 rows) that must remain untouched.
  tablesFilter: ["!rates_backup_20260610"],
});
