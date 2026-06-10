import { resolve } from "path";
import { readFileSync } from "fs";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const csvPath = resolve(process.cwd(), "Server/data/BIC_2026_Rates.csv");

// RFC4180-ish CSV parser. Keeps every field as a raw string (no type coercion),
// so zero-padded class codes like "0035" and alphanumerics like "7227A" survive.
function parseCSV(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // ignore CR
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// "1/1/2026" -> "2026-01-01" (EffectiveDate is reference-only, but the column is a DATE)
function toISODate(s) {
  const parts = String(s || "").trim().split("/");
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
  if (!m || !d || !y) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

const raw = readFileSync(csvPath, "utf8");
const parsed = parseCSV(raw);
const header = parsed[0].map((h) => h.trim());
const stateIdx = header.indexOf("State");
const dateIdx = header.indexOf("EffectiveDate");
const codeIdx = header.indexOf("ClassCode");
const descIdx = header.indexOf("Description");
const rateIdx = header.indexOf("Base Rate");

if ([stateIdx, dateIdx, codeIdx, rateIdx].includes(-1)) {
  console.error("CSV header missing required columns. Found:", header);
  process.exit(1);
}

const records = [];
let skippedBlank = 0;
let malformed = 0;

for (let i = 1; i < parsed.length; i++) {
  const r = parsed[i];
  // a fully blank trailing line
  if (r.length === 1 && r[0].trim() === "") continue;
  if (r.length < 5) {
    malformed++;
    console.log(`Row ${i + 1}: unexpected column count (${r.length}) -> ${JSON.stringify(r)}`);
    continue;
  }

  const state = (r[stateIdx] || "").trim();
  const classCode = (r[codeIdx] || "").trim(); // EXACT, no zero-stripping
  const description = (r[descIdx] || "").trim();
  const rateRaw = (r[rateIdx] || "").trim().replace(/[$%]/g, "");

  // Skip blank rows (empty ClassCode), per spec.
  if (!classCode) {
    skippedBlank++;
    continue;
  }

  const effDate = toISODate(r[dateIdx]);

  records.push({
    state,
    effectiveDate: effDate,
    classCode,
    description: description || null,
    baseRate: rateRaw,
  });
}

console.log(`Parsed ${records.length} importable rows (skipped ${skippedBlank} blank, ${malformed} malformed).`);

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  // 1. Backup BEFORE any write.
  const now = new Date();
  const dateStamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  let backupName = `rates_backup_${dateStamp}`;
  const exists = await client.query(`SELECT to_regclass($1) AS t`, [`public.${backupName}`]);
  if (exists.rows[0].t) {
    backupName = `${backupName}_${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
  }
  await client.query(`CREATE TABLE ${backupName} AS SELECT * FROM wc_rates`);
  const backupCount = await client.query(`SELECT count(*)::int AS c FROM ${backupName}`);
  console.log(`Backup created: ${backupName} (${backupCount.rows[0].c} rows)`);

  // 2. Full replace.
  await client.query(`TRUNCATE TABLE wc_rates`);

  // 3. Bulk insert ALL rows (no dedup, no ON CONFLICT — duplicates are intentional).
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let p = 1;
    for (const row of batch) {
      values.push(`($${p}, $${p + 1}, $${p + 2}, $${p + 3}, $${p + 4})`);
      params.push(row.state, row.effectiveDate, row.classCode, row.description, row.baseRate);
      p += 5;
    }
    await client.query(
      `INSERT INTO wc_rates (state, effective_date, class_code, description, base_rate) VALUES ${values.join(", ")}`,
      params,
    );
    inserted += batch.length;
  }

  const finalCount = await client.query(`SELECT count(*)::int AS c FROM wc_rates`);
  console.log(`\nImport complete:`);
  console.log(`  Backup table: ${backupName} (${backupCount.rows[0].c} rows)`);
  console.log(`  Rows inserted: ${inserted}`);
  console.log(`  wc_rates final count: ${finalCount.rows[0].c}`);

  await client.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
