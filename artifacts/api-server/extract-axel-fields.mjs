import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from "pdf-lib";

const path = "/home/runner/workspace/Server/data/Axel - Cannabis WC Application 2026.pdf";
const bytes = await readFile(path);
const doc = await PDFDocument.load(bytes);
const form = doc.getForm();
const fields = form.getFields();

const out = [];
for (const f of fields) {
  const name = f.getName();
  let kind = "unknown";
  if (f instanceof PDFTextField) kind = "text";
  else if (f instanceof PDFCheckBox) kind = "checkbox";
  else if (f instanceof PDFRadioGroup) kind = "radio";
  else if (f instanceof PDFDropdown) kind = "dropdown";

  // Get widgets and their positions
  const widgets = f.acroField.getWidgets();
  const positions = widgets.map(w => {
    const rect = w.getRectangle();
    const pageRef = w.P();
    let pageIndex = -1;
    const pages = doc.getPages();
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].ref === pageRef) { pageIndex = i; break; }
    }
    return {
      page: pageIndex,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });
  out.push({ name, kind, positions });
}
console.log("Total fields:", out.length);
console.log("Sample:", JSON.stringify(out.slice(0, 5), null, 2));
await writeFile("/tmp/axel_fields.json", JSON.stringify(out, null, 2));
console.log("Written /tmp/axel_fields.json");
