import { readFile, writeFile } from "node:fs/promises";

// Use pdfjs-dist if installed; else fallback
let pdfjs;
try { pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs"); }
catch { try { pdfjs = await import("pdfjs-dist"); } catch { console.error("No pdfjs"); process.exit(2); } }

const path = "/home/runner/workspace/Server/data/Axel - Cannabis WC Application 2026.pdf";
const data = await readFile(path);
const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
const out = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  const items = tc.items.map(it => ({
    str: it.str,
    x: it.transform[4],
    y: it.transform[5],
    w: it.width,
    h: it.height,
  }));
  out.push({ page: p - 1, items });
}
await writeFile("/tmp/axel_text.json", JSON.stringify(out));
console.log("Pages:", out.length, "Total items:", out.reduce((a, p) => a + p.items.length, 0));
