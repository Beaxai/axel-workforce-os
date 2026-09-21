"""Read-only PDF inventory and contact sheet for supplied blank appointment forms."""
from pathlib import Path
import json
import fitz

root = Path("attached_assets")
out = Path(".agents/outputs/appointment-pdf-review")
out.mkdir(parents=True, exist_ok=True)
inventory = []
sheet = fitz.open()
for name in [
    "Axel_ACH_Authorization_1789959996682.pdf",
    "Axel_Producer_Appointment_Application_1789959996682.pdf",
    "Axel_National_Producer_Agreement_1789959996682.pdf",
    "fw9_1789959996682.pdf",
]:
    doc = fitz.open(root / name)
    pages = []
    for i, page in enumerate(doc):
        widgets = list(page.widgets() or [])
        pages.append({"page": i + 1, "widgets": len(widgets),
                      "field_types": sorted(set(w.field_type_string for w in widgets))})
    inventory.append({"file": name, "pages": len(doc), "page_inventory": pages})
    (out / (name + ".txt")).write_text("\n".join(
        f"\n=== PAGE {i+1} ===\n{page.get_text()}" for i, page in enumerate(doc)))
    selected = list(range(len(doc))) if len(doc) <= 3 else (
        [8, 9, 10, 11] if "Agreement" in name else [0])
    selected = [i for i in selected if i < len(doc)]
    for i in selected:
        target = sheet.new_page(width=612, height=820)
        target.insert_text((12, 16), f"{name} - page {i+1}", fontsize=9)
        target.show_pdf_page(fitz.Rect(0, 28, 612, 820), doc, i)
print(json.dumps(inventory, indent=2))
# Compact contact sheet, preserving legibility for structural review.
rows = (len(sheet) + 2) // 3
combined = fitz.open()
canvas = combined.new_page(width=3*306, height=rows*410)
for i in range(len(sheet)):
    x, y = (i % 3)*306, (i // 3)*410
    canvas.show_pdf_page(fitz.Rect(x, y, x+306, y+410), sheet, i)
canvas.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(out / "contact-sheet.png")