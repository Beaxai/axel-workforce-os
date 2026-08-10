/**
 * Seeds the §6A WC bind-subjectivities template as a system template.
 * Idempotent: re-running makes no changes.
 * Run: pnpm --filter @workspace/api-server seed:subjectivities
 */
import {
  db,
  subjectivityTemplatesTable,
  subjectivityTemplateItemsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { SUBJ_TEMPLATE_NAME, PEO_SUBJ_TEMPLATE_NAME, SUBJ_KEYS } from "../lib/subjectivities";

const ITEMS = [
  { key: SUBJ_KEYS.ACORD_130, name: "Signed ACORD 130 application", sortOrder: 1, isConditional: false, isBlocking: true, notes: "AcroForm pre-filled from submission data" },
  { key: SUBJ_KEYS.SUPPLEMENTAL_APP, name: "Signed supplemental application", sortOrder: 2, isConditional: false, isBlocking: true, notes: "Trean Supp mapped; Axel Cannabis WC 481-field mapping pending (P6)" },
  { key: SUBJ_KEYS.QUOTE_ACCEPTANCE, name: "Signed quote acceptance", sortOrder: 3, isConditional: false, isBlocking: true, notes: "Carries billing frequency + type; carrier deposit due within 30 days of binding, paid directly to carrier" },
  { key: SUBJ_KEYS.TRIA_ELECTION, name: "TRIA (terrorism) election", sortOrder: 4, isConditional: false, isBlocking: true, notes: null },
  { key: SUBJ_KEYS.FRAUD_WARNINGS, name: "Fraud warnings", sortOrder: 5, isConditional: false, isBlocking: true, notes: null },
  { key: SUBJ_KEYS.STATE_NOTICES, name: "State notices", sortOrder: 6, isConditional: false, isBlocking: true, notes: "State-specific set per deal state(s); v1 emits one generic item" },
  { key: SUBJ_KEYS.OFFICER_EXCLUSION, name: "Officer exclusion/rejection forms", sortOrder: 7, isConditional: false, isBlocking: true, notes: null },
  { key: SUBJ_KEYS.WAIVER_FORMS, name: "Waiver forms", sortOrder: 8, isConditional: false, isBlocking: true, notes: null },
  { key: SUBJ_KEYS.LOSS_HISTORY, name: "Currently valued loss history", sortOrder: 9, isConditional: true, isBlocking: true, notes: "Carrier requires valuation within 60 days of desired effective date" },
  { key: SUBJ_KEYS.BROKER_FEE, name: "Axel broker fee", sortOrder: 10, isConditional: false, isBlocking: false, notes: "7% default, deal-level editable. TRACKED, NON-BLOCKING — never prevents carrier submission or binding" },
];

// §7G: PEO subjectivities = the FULL WC checklist PLUS the signed Client
// Service Agreement (CSA-PEO). Named "CSA-PEO" everywhere to avoid collision
// with the CSA (Client Service Associate) role.
const PEO_ITEMS = [
  ...ITEMS,
  {
    key: SUBJ_KEYS.CSA_PEO,
    name: "Signed Client Service Agreement (CSA-PEO)",
    sortOrder: 11,
    isConditional: false,
    isBlocking: true,
    notes: "PEO only (§7G). Signing date anchors payroll scheduling (start = signing + 14 days). Satisfying this item auto-completes PEO tracker phase 1.",
  },
];

async function seedOne(
  dbc: typeof db,
  productType: "WC" | "PEO",
  name: string,
  items: typeof PEO_ITEMS,
): Promise<{ templateId: string; created: boolean }> {
  const [existing] = await dbc
    .select({ id: subjectivityTemplatesTable.id })
    .from(subjectivityTemplatesTable)
    .where(and(eq(subjectivityTemplatesTable.isSystem, true), eq(subjectivityTemplatesTable.productType, productType)))
    .limit(1);
  if (existing) return { templateId: existing.id, created: false };

  const [tpl] = await dbc
    .insert(subjectivityTemplatesTable)
    .values({ name, productType, isActive: true, isSystem: true })
    .returning();

  for (const i of items) {
    await dbc.insert(subjectivityTemplateItemsTable).values({
      templateId: tpl!.id,
      name: i.name,
      sortOrder: i.sortOrder,
      systemKey: i.key,
      isConditional: i.isConditional,
      isBlocking: i.isBlocking,
      notes: i.notes,
    });
  }
  return { templateId: tpl!.id, created: true };
}

export async function seedSubjectivityTemplate(dbc: typeof db = db): Promise<{ templateId: string; created: boolean }> {
  return seedOne(dbc, "WC", SUBJ_TEMPLATE_NAME, ITEMS);
}

export async function seedPeoSubjectivityTemplate(dbc: typeof db = db): Promise<{ templateId: string; created: boolean }> {
  return seedOne(dbc, "PEO", PEO_SUBJ_TEMPLATE_NAME, PEO_ITEMS);
}

async function main() {
  const r = await seedSubjectivityTemplate();
  console.log(r.created ? `Seeded WC subjectivity template ${r.templateId}` : `WC subjectivity template already present (${r.templateId}) — no change`);
  const p = await seedPeoSubjectivityTemplate();
  console.log(p.created ? `Seeded PEO subjectivity template ${p.templateId}` : `PEO subjectivity template already present (${p.templateId}) — no change`);
  process.exit(0);
}

void main();
