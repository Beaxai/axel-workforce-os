import { readFile } from "node:fs/promises";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from "pdf-lib";

async function inspect(path, label) {
  const bytes = await readFile(path);
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const fields = form.getFields();
  let total = 0, filledTextOrDropdown = 0, checkedBoxes = 0, selectedRadios = 0;
  const filledExamples = [];
  for (const f of fields) {
    total++;
    const name = f.getName();
    if (f instanceof PDFTextField) {
      const v = f.getText();
      if (v && v.trim()) {
        filledTextOrDropdown++;
        if (filledExamples.length < 20) filledExamples.push(`${name} = "${v.slice(0, 50)}"`);
      }
    } else if (f instanceof PDFCheckBox) {
      if (f.isChecked()) {
        checkedBoxes++;
        if (filledExamples.length < 20) filledExamples.push(`${name} = ✓`);
      }
    } else if (f instanceof PDFRadioGroup) {
      const sel = f.getSelected();
      if (sel) {
        selectedRadios++;
        if (filledExamples.length < 20) filledExamples.push(`${name} = ${sel}`);
      }
    } else if (f instanceof PDFDropdown) {
      const sel = f.getSelected();
      if (sel && sel.length && sel[0]) {
        filledTextOrDropdown++;
        if (filledExamples.length < 20) filledExamples.push(`${name} = ${sel[0]}`);
      }
    }
  }
  console.log(`\n=== ${label} ===`);
  console.log(`Total fields: ${total}`);
  console.log(`Filled text/dropdown: ${filledTextOrDropdown}`);
  console.log(`Checked checkboxes: ${checkedBoxes}`);
  console.log(`Selected radios: ${selectedRadios}`);
  console.log(`Examples:`);
  filledExamples.forEach(e => console.log(`  ${e}`));
}

await inspect("/tmp/acord.pdf", "ACORD 130");
await inspect("/tmp/trean.pdf", "Trean Cannabis Supp");
await inspect("/tmp/axel.pdf", "Axel Cannabis WC App");
