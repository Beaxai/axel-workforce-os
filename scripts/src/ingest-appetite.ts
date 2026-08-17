import { resolve } from "path";
import pg from "pg";
import readXlsxFile from "read-excel-file/node";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const filePath = process.argv[2] || resolve(process.cwd(), "data/Combined_Aligned_With_Benchmark_Appetite.xlsx");
console.log("Reading:", filePath);

type SheetEntry = { sheet: string; data: (string | number | boolean | Date | null)[][] };
let sheetEntries: SheetEntry[];
try {
  sheetEntries = (await readXlsxFile(filePath)) as SheetEntry[];
} catch (err) {
  console.error(`Failed to read Excel file at ${filePath}: ${(err as Error).message}`);
  console.error("Usage: pnpm --filter @workspace/scripts run ingest-appetite [path-to-xlsx]");
  process.exit(1);
}

const TARGET_SHEET = "Combined_All";
const sheetEntry = sheetEntries.find((s) => s.sheet === TARGET_SHEET) ?? sheetEntries[0];
if (!sheetEntry) {
  const available = sheetEntries.map((s) => s.sheet).join(", ");
  console.error(`No sheets found. Available: ${available}`);
  process.exit(1);
}

console.log(`Using sheet: ${sheetEntry.sheet}`);
const allRows = sheetEntry.data;

if (allRows.length < 2) {
  console.error("No data found in worksheet");
  process.exit(1);
}

// First row is headers
const headers = allRows[0].map((h) => String(h ?? "").trim());

// Convert remaining rows to header-keyed objects
const rows: Record<string, unknown>[] = allRows.slice(1).map((row) => {
  const obj: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    if (h) obj[h] = row[i] ?? null;
  });
  return obj;
});
console.log(`Rows read: ${rows.length}`);

function normDet(v: unknown): string {
  if (!v) return "Unknown";
  const s = String(v).trim().toLowerCase();
  const map: Record<string, string> = {
    acceptable: "Acceptable",
    referral: "Referral",
    conditional: "Conditional",
    ineligible: "Ineligible",
  };
  return map[s] || "Unknown";
}

interface AppetiteRecord {
  state: string;
  class_code: string;
  description: string | null;
  base_rate: number | null;
  uw_determination: string;
  uw_considerations: string | null;
}

const rawRecords: AppetiteRecord[] = rows
  .map((r) => ({
    state: String(r["State"] || "").trim().toUpperCase(),
    class_code: String(r["BaseCode"] || r["ClassCode"] || r["Class Code"] || "").trim(),
    description: r["Description"] ? String(r["Description"]).trim() : null,
    base_rate: r["Base Rate"] != null ? parseFloat(String(r["Base Rate"])) : null,
    uw_determination: normDet(r["Benchmark_UW_Determination"] || r["UW_Determination"]),
    uw_considerations: r["Benchmark_UW_Considerations"] || r["UW_Considerations"]
      ? String(r["Benchmark_UW_Considerations"] || r["UW_Considerations"]).trim()
      : null,
  }))
  .filter((r) => r.state && r.class_code);

const deduped = new Map<string, AppetiteRecord>();
for (const r of rawRecords) {
  deduped.set(`${r.state}:${r.class_code}`, r);
}
const records = Array.from(deduped.values());

console.log(`Rows parsed: ${rawRecords.length}, Unique records: ${records.length}`);

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const BATCH = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const values: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      for (const r of batch) {
        values.push(
          `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
        );
        params.push(r.state, r.class_code, r.description, r.base_rate, r.uw_determination, r.uw_considerations);
      }

      const sql = `
        INSERT INTO appetite (state, class_code, description, base_rate, uw_determination, uw_considerations)
        VALUES ${values.join(", ")}
        ON CONFLICT (state, class_code)
        DO UPDATE SET
          description = EXCLUDED.description,
          base_rate = EXCLUDED.base_rate,
          uw_determination = EXCLUDED.uw_determination,
          uw_considerations = EXCLUDED.uw_considerations,
          updated_at = now()
      `;

      await client.query(sql, params);
      inserted += batch.length;
      console.log(`Upserted ${inserted}/${records.length}`);
    }

    const result = await client.query(
      "SELECT uw_determination, COUNT(*) as cnt FROM appetite GROUP BY uw_determination ORDER BY cnt DESC"
    );
    console.log("\nAppetite summary:");
    for (const row of result.rows) {
      console.log(`  ${row.uw_determination}: ${row.cnt}`);
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log("Done.");
}

run().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
