import { resolve } from "path";
import pg from "pg";
import XLSX from "xlsx";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const xlsxPath = resolve(process.cwd(), "Benchmark - Cannabis Rates 11-25 (1).xlsx");
let wb;
try {
  wb = XLSX.readFile(xlsxPath);
} catch {
  console.error(`Excel file not found at ${xlsxPath}`);
  process.exit(1);
}

const sheetName = process.argv[2] || "BIC";
const ws = wb.Sheets[sheetName];
if (!ws) {
  console.error(`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(", ")}`);
  process.exit(1);
}

console.log(`Importing sheet: ${sheetName}`);
console.log(`Available sheets: ${wb.SheetNames.join(", ")}`);

const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
const header = rawData[0].map((h) => String(h).trim());
const stateIdx = header.indexOf("State");
const dateIdx = header.indexOf("EffectiveDate");
const codeIdx = header.indexOf("ClassCode");
const descIdx = header.indexOf("Description");
const rateIdx = header.indexOf("Base Rate");

if ([stateIdx, dateIdx, codeIdx, rateIdx].includes(-1)) {
  console.error("Sheet header missing required columns. Found:", header);
  process.exit(1);
}

function excelDateToISO(serial) {
  if (typeof serial === "string") {
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return null;
  }
  if (typeof serial === "number") {
    const utcDays = Math.floor(serial - 25569);
    const d = new Date(utcDays * 86400000);
    return d.toISOString().split("T")[0];
  }
  return null;
}

const rows = [];
let skipped = 0;

for (let i = 1; i < rawData.length; i++) {
  const r = rawData[i];
  const state = String(r[stateIdx] || "").trim();
  const classCode = String(r[codeIdx] || "").trim();
  const desc = String(r[descIdx] || "").trim();
  const rateRaw = String(r[rateIdx] || "").trim().replace(/[$%]/g, "");

  if (!state || !classCode || !rateRaw) {
    skipped++;
    continue;
  }

  const baseRate = parseFloat(rateRaw);
  if (isNaN(baseRate)) {
    skipped++;
    console.log(`Skipped row ${i + 1}: invalid base rate "${rateRaw}"`);
    continue;
  }

  const effDate = excelDateToISO(r[dateIdx]);
  if (!effDate) {
    skipped++;
    console.log(`Skipped row ${i + 1}: invalid date "${r[dateIdx]}"`);
    continue;
  }

  rows.push({ state, effectiveDate: effDate, classCode, description: desc || null, baseRate });
}

const deduped = new Map();
for (const row of rows) {
  const key = `${row.state}|${row.classCode}|${row.effectiveDate}`;
  deduped.set(key, row);
}
const uniqueRows = Array.from(deduped.values());
console.log(`Deduplicated: ${rows.length} → ${uniqueRows.length} unique rows`);

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log(`Inserting ${uniqueRows.length} unique rows...`);

  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < uniqueRows.length; i += BATCH) {
    const batch = uniqueRows.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const row of batch) {
      values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4})`);
      params.push(row.state, row.effectiveDate, row.classCode, row.description, row.baseRate);
      paramIdx += 5;
    }

    const query = `
      INSERT INTO wc_rates (state, effective_date, class_code, description, base_rate)
      VALUES ${values.join(", ")}
      ON CONFLICT (state, class_code, effective_date) DO UPDATE SET
        description = EXCLUDED.description,
        base_rate = EXCLUDED.base_rate
    `;

    await client.query(query, params);
    inserted += batch.length;
    if (i % 5000 === 0) console.log(`Progress: ${inserted}/${uniqueRows.length}`);
  }

  console.log(`\nImport complete:`);
  console.log(`  Rows processed: ${rows.length + skipped}`);
  console.log(`  Rows inserted/updated: ${inserted}`);
  console.log(`  Rows skipped: ${skipped}`);

  await client.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
