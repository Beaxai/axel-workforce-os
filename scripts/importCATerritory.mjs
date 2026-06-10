import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

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
    } else if (c === '"') {
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
      // ignore
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function main() {
  const csvPath = resolve(process.cwd(), "Server/data/CA_Territorial_Rates.csv");
  const text = readFileSync(csvPath, "utf8");
  const rows = parseCSV(text).filter((r) => r.length > 1 && r.some((c) => c.trim() !== ""));
  const [, ...dataRows] = rows; // drop header

  const records = dataRows.map((r) => ({
    zipPrefixMin: parseInt(r[0], 10),
    zipPrefixMax: parseInt(r[1], 10),
    territory: parseInt(r[2], 10),
    counties: r[3] ?? "",
    multiplier: r[4],
  }));

  console.log(`Parsed ${records.length} CA territory rows.`);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("TRUNCATE TABLE ca_territorial_rates RESTART IDENTITY;");
    for (const rec of records) {
      await client.query(
        `INSERT INTO ca_territorial_rates (zip_prefix_min, zip_prefix_max, territory, counties, multiplier)
         VALUES ($1, $2, $3, $4, $5)`,
        [rec.zipPrefixMin, rec.zipPrefixMax, rec.territory, rec.counties, rec.multiplier],
      );
    }
    const { rows: countRows } = await client.query("SELECT count(*)::int AS c FROM ca_territorial_rates;");
    console.log(`Import complete: ca_territorial_rates count = ${countRows[0].c}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
