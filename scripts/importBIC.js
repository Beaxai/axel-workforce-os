import { readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const csvPath = resolve(process.cwd(), "BIC.csv");
let csvData;
try {
  csvData = readFileSync(csvPath, "utf-8");
} catch {
  console.error(`BIC.csv not found at ${csvPath}`);
  process.exit(1);
}

const lines = csvData.split("\n").map((l) => l.trim()).filter(Boolean);
const header = lines[0].split(",").map((h) => h.trim());
const stateIdx = header.indexOf("State");
const dateIdx = header.indexOf("EffectiveDate");
const codeIdx = header.indexOf("ClassCode");
const descIdx = header.indexOf("Description");
const rateIdx = header.indexOf("Base Rate");

if ([stateIdx, dateIdx, codeIdx, rateIdx].includes(-1)) {
  console.error("CSV header missing required columns. Found:", header);
  process.exit(1);
}

const rows = [];
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const parts = parseCSVLine(lines[i]);
  const state = (parts[stateIdx] || "").trim();
  const effDateRaw = (parts[dateIdx] || "").trim();
  const classCode = (parts[codeIdx] || "").trim();
  const desc = (parts[descIdx] || "").trim();
  const rateRaw = (parts[rateIdx] || "").trim().replace(/[$%]/g, "");

  if (!state || !classCode || !rateRaw) {
    skipped++;
    console.log(`Skipped row ${i + 1}: missing required field`);
    continue;
  }

  const baseRate = parseFloat(rateRaw);
  if (isNaN(baseRate)) {
    skipped++;
    console.log(`Skipped row ${i + 1}: invalid base rate "${rateRaw}"`);
    continue;
  }

  const effDate = parseDate(effDateRaw);
  if (!effDate) {
    skipped++;
    console.log(`Skipped row ${i + 1}: invalid date "${effDateRaw}"`);
    continue;
  }

  rows.push({ state, effectiveDate: effDate, classCode, description: desc || null, baseRate });
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log(`Parsed ${rows.length} valid rows, ${skipped} skipped`);

  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
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
    if (i % 5000 === 0) console.log(`Progress: ${inserted}/${rows.length}`);
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
