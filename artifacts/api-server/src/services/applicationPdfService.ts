/**
 * Stateless PDF generation: load each template fresh per request, fill the
 * AcroForm fields from canonical answers, and stream the bytes back. No
 * binary blobs are stored.
 */
import { PDFDocument, PDFCheckBox, PDFRadioGroup, PDFTextField } from "pdf-lib";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import {
  cannabisApplicationAnswersSchema,
  acord130Mapping,
  acord130LocationRowFields,
  acord130OwnerRowFields,
  treanMapping,
  treanVehicleMaintenanceCheckboxes,
  treanSafetyTrainingCheckboxes,
  treanHistoricalTableField,
  treanSignatureConfirmCheckbox,
  axelMapping,
  axelLocationRowFields,
  axelOwnerRowFields,
  axelClassCodeRowFields,
  axelClassCodesTotalPayrollField,
  axelPriorPolicyRowFields,
  axelHistoricalPremiumRowFields,
  axelReturnToWorkCheckboxes,
  axelSafetyProgramCheckboxes,
  axelSafetyTrainingCheckboxes,
  axelSafetyMeetingFreqCheckboxes,
  axelSafetyMeetingFreqQuarterlyText,
  axelLiftingExposureCheckboxes,
  axelMaxDepthMapping,
  axelMaxHeightMapping,
  axelSecurityGuardsCheckboxes,
  axelDrivingMileagePctCheckboxes,
  axelDeliveryTypeCheckboxes,
  axelVehicleMaintenanceCheckboxes,
  axelOutsideSecurityCompanyCheckbox,
  type CannabisApplicationAnswers,
  type AcordTransform,
} from "@workspace/cannabis-application";
import { logger } from "../lib/logger";

/**
 * Resolve the workspace root by walking up from cwd looking for `Server/data`.
 * The api-server runs with cwd=`artifacts/api-server` under pnpm; templates live
 * at the monorepo root under `Server/data/`.
 */
function findTemplatesDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "Server", "data");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume invoked from the workspace root.
  return path.resolve(process.cwd(), "Server/data");
}

const TEMPLATES_DIR = findTemplatesDir();
const ACORD_130_TEMPLATE = path.join(TEMPLATES_DIR, "Acord 130-Axel.pdf");
const TREAN_SUPP_TEMPLATE = path.join(TEMPLATES_DIR, "Trean - Cannabis Supp.pdf");
const AXEL_CANNABIS_APP_TEMPLATE = path.join(TEMPLATES_DIR, "Axel - Cannabis WC Application 2026.pdf");

let acordTemplateCache: Uint8Array | null = null;
let treanTemplateCache: Uint8Array | null = null;
let axelAppTemplateCache: Uint8Array | null = null;

async function loadTemplate(p: string, cache: Uint8Array | null): Promise<{ bytes: Uint8Array; updatedCache: Uint8Array }> {
  if (cache) return { bytes: cache, updatedCache: cache };
  const buf = await fs.readFile(p);
  const u8 = new Uint8Array(buf);
  return { bytes: u8, updatedCache: u8 };
}

function applyTransform(value: string, transform?: AcordTransform): string {
  if (!value) return "";
  switch (transform) {
    case "yes_no":
      return value === "yes" ? "Yes" : value === "no" ? "No" : "";
    case "yes_no_uppercase":
      return value === "yes" ? "YES" : value === "no" ? "NO" : "";
    case "uppercase":
      return value.toUpperCase();
    case "currency":
      return value ? `$${value}` : "";
    case "percent_string":
      return value ? `${value}%` : "";
    case "boolean_x":
      return value === "true" || value === "yes" ? "X" : "";
    default:
      return value;
  }
}

function trySetText(form: ReturnType<PDFDocument["getForm"]>, fieldName: string, value: string) {
  try {
    const f = form.getField(fieldName);
    if (f instanceof PDFTextField) {
      f.setText(value || "");
    }
  } catch {
    // Field doesn't exist in this template; mappings are best-effort.
  }
}

function trySetCheckbox(form: ReturnType<PDFDocument["getForm"]>, fieldName: string, on: boolean) {
  try {
    const f = form.getField(fieldName);
    if (f instanceof PDFCheckBox) {
      if (on) f.check();
      else f.uncheck();
    }
  } catch {
    // ignore
  }
}

function trySetRadio(form: ReturnType<PDFDocument["getForm"]>, fieldName: string, optionLabel: string) {
  if (!optionLabel) return;
  try {
    const f = form.getField(fieldName);
    if (f instanceof PDFRadioGroup) {
      f.select(optionLabel);
    }
  } catch (err) {
    logger.warn({ fieldName, optionLabel, err: (err as Error).message }, "trySetRadio failed");
  }
}

/** Fill the ACORD 130 template from canonical answers. */
export async function fillAcord130(rawAnswers: unknown): Promise<Uint8Array> {
  const answers = cannabisApplicationAnswersSchema.parse(rawAnswers);
  const { bytes, updatedCache } = await loadTemplate(ACORD_130_TEMPLATE, acordTemplateCache);
  acordTemplateCache = updatedCache;
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();

  // Scalar mappings
  for (const [canonicalKey, mapping] of Object.entries(acord130Mapping)) {
    if (!mapping) continue;
    const raw = answers[canonicalKey as keyof CannabisApplicationAnswers];
    if (raw === undefined || raw === null) continue;
    const value = applyTransform(String(raw), mapping.transform);
    trySetText(form, mapping.pdfField, value);
  }

  // Location rows
  for (let i = 0; i < Math.min(answers.locations.length, acord130LocationRowFields.length); i++) {
    const loc = answers.locations[i];
    const cols = acord130LocationRowFields[i];
    trySetText(form, cols.loc, loc.loc || String(i + 1));
    const addr = [loc.streetAddress, loc.city, loc.state, loc.zip].filter(Boolean).join(", ");
    trySetText(form, cols.address, addr);
  }

  // Owner rows
  for (let i = 0; i < Math.min(answers.ownersOfficers.length, acord130OwnerRowFields.length); i++) {
    const owner = answers.ownersOfficers[i];
    const cols = acord130OwnerRowFields[i];
    trySetText(form, cols.name, `${owner.firstName} ${owner.lastName}`.trim());
    trySetText(form, cols.ownership, owner.ownershipPct);
    trySetText(form, cols.duties, owner.duties);
    trySetText(form, cols.incExc, owner.included ? "INC" : "EXC");
  }

  form.flatten();
  return await pdf.save();
}

/**
 * Fill the Axel Cannabis WC Application 2026 template from canonical answers.
 *
 * The template has 481 AcroForm fields, all auto-named generically by Adobe
 * InDesign (`Text Field 71`, `Check Box 35`, ...). Mapping is provided by
 * `@workspace/cannabis-application/mappings/axel-cannabis-app.ts`, which was
 * built from per-field coordinate analysis correlated against the PDF's
 * extracted text layer.
 */
export async function fillAxelCannabisApplication(rawAnswers: unknown): Promise<Uint8Array> {
  const answers = cannabisApplicationAnswersSchema.parse(rawAnswers);
  const { bytes, updatedCache } = await loadTemplate(AXEL_CANNABIS_APP_TEMPLATE, axelAppTemplateCache);
  axelAppTemplateCache = updatedCache;
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();

  // Scalar mappings (text + checkbox + yesno + yesnona)
  for (const [canonicalKey, mapping] of Object.entries(axelMapping)) {
    if (!mapping) continue;
    const raw = answers[canonicalKey as keyof CannabisApplicationAnswers];
    if (raw === undefined || raw === null) continue;
    if (mapping.kind === "text") {
      trySetText(form, mapping.pdfField, String(raw));
    } else if (mapping.kind === "checkbox") {
      trySetCheckbox(form, mapping.pdfField, raw === true);
    } else if (mapping.kind === "yesno") {
      trySetCheckbox(form, mapping.yes, raw === "yes");
      trySetCheckbox(form, mapping.no, raw === "no");
    } else if (mapping.kind === "yesnona") {
      trySetCheckbox(form, mapping.yes, raw === "yes");
      trySetCheckbox(form, mapping.no, raw === "no");
      if (mapping.na) trySetCheckbox(form, mapping.na, raw === "na");
    }
  }

  // ── Locations table (4 rows, page 0) ──────────────────────
  for (let i = 0; i < Math.min(answers.locations.length, axelLocationRowFields.length); i++) {
    const loc = answers.locations[i];
    const cols = axelLocationRowFields[i];
    trySetText(form, cols.loc, loc.loc || String(i + 1));
    trySetText(form, cols.street, loc.streetAddress);
    trySetText(form, cols.suite, loc.suite);
    trySetText(form, cols.city, loc.city);
    trySetText(form, cols.state, loc.state);
    trySetText(form, cols.zip, loc.zip);
  }

  // ── Owners / Officers table (4 rows, page 0) ──────────────
  for (let i = 0; i < Math.min(answers.ownersOfficers.length, axelOwnerRowFields.length); i++) {
    const owner = answers.ownersOfficers[i];
    const cols = axelOwnerRowFields[i];
    trySetText(form, cols.firstName, owner.firstName);
    trySetText(form, cols.lastName, owner.lastName);
    trySetText(form, cols.ownership, owner.ownershipPct);
    trySetText(form, cols.duties, owner.duties);
    trySetText(form, cols.incExc, owner.included ? "INC" : "EXC");
  }

  // ── Class Codes table (15 rows, page 1) ───────────────────
  let payrollSum = 0;
  for (let i = 0; i < Math.min(answers.classCodes.length, axelClassCodeRowFields.length); i++) {
    const cc = answers.classCodes[i];
    const cols = axelClassCodeRowFields[i];
    trySetText(form, cols.loc, cc.loc);
    trySetText(form, cols.classCode, cc.classCode);
    trySetText(form, cols.description, cc.description);
    trySetText(form, cols.fullTime, cc.fullTime);
    trySetText(form, cols.partTime, cc.partTime);
    trySetText(form, cols.annualPayroll, cc.annualPayroll);
    const n = Number(cc.annualPayroll);
    if (Number.isFinite(n)) payrollSum += n;
  }
  if (payrollSum > 0) {
    trySetText(form, axelClassCodesTotalPayrollField, String(payrollSum));
  }

  // ── Prior Policies table (5 rows, page 1) ─────────────────
  for (let i = 0; i < Math.min(answers.priorPolicies.length, axelPriorPolicyRowFields.length); i++) {
    const p = answers.priorPolicies[i];
    const cols = axelPriorPolicyRowFields[i];
    trySetText(form, cols.effective, p.effectiveDate);
    trySetText(form, cols.expiration, p.expirationDate);
    trySetText(form, cols.carrier, p.carrier);
    trySetText(form, cols.premium, p.premium);
    trySetText(form, cols.claims, p.claimCount);
    trySetText(form, cols.amount, p.claimsAmount);
  }

  // ── Historical Premiums table (6 rows, page 6) ────────────
  for (let i = 0; i < Math.min(answers.historicalPremiums.length, axelHistoricalPremiumRowFields.length); i++) {
    const h = answers.historicalPremiums[i];
    const cols = axelHistoricalPremiumRowFields[i];
    trySetText(form, cols.payroll, h.payroll);
    trySetText(form, cols.premium, h.premium);
    trySetText(form, cols.subCosts, h.subCosts);
  }

  // ── Special enum mappings (single-of-N checkboxes) ────────
  const checkOneOf = (m: Record<string, string>, value: string) => {
    for (const [k, fieldName] of Object.entries(m)) {
      trySetCheckbox(form, fieldName, k === value);
    }
  };

  checkOneOf(axelReturnToWorkCheckboxes, answers.returnToWork);
  checkOneOf(axelSafetyProgramCheckboxes, answers.safetyProgram);
  checkOneOf(axelSafetyTrainingCheckboxes, answers.safetyTraining);
  checkOneOf(axelSafetyMeetingFreqCheckboxes, answers.safetyMeetingFreq);
  if (answers.safetyMeetingFreq === "quarterly") {
    trySetText(form, axelSafetyMeetingFreqQuarterlyText, "X");
  }
  checkOneOf(axelLiftingExposureCheckboxes, answers.liftingExposure);
  checkOneOf(axelSecurityGuardsCheckboxes, answers.securityGuards);
  checkOneOf(axelDrivingMileagePctCheckboxes,
    answers.drivingMileagePctLt50 === "100" ? "lt50"
    : answers.drivingMileagePct50to100 === "100" ? "50to100"
    : answers.drivingMileagePct100plus === "100" ? "100plus"
    : "");
  checkOneOf(axelVehicleMaintenanceCheckboxes, answers.vehicleMaintenance);

  // Delivery types (independent multi-select, not enum)
  trySetCheckbox(form, axelDeliveryTypeCheckboxes.retail, answers.deliveryRetailPct === "100");
  trySetCheckbox(form, axelDeliveryTypeCheckboxes.wholesale, answers.deliveryWholesalePct === "100");

  // Max depth / max height: mixed text + checkbox widget styles
  for (const [k, fieldName] of Object.entries(axelMaxDepthMapping.text)) {
    trySetText(form, fieldName, k === answers.maxDepth ? "X" : "");
  }
  for (const [k, fieldName] of Object.entries(axelMaxDepthMapping.checkbox)) {
    trySetCheckbox(form, fieldName, k === answers.maxDepth);
  }
  for (const [k, fieldName] of Object.entries(axelMaxHeightMapping.text)) {
    trySetText(form, fieldName, k === answers.maxHeight ? "X" : "");
  }
  for (const [k, fieldName] of Object.entries(axelMaxHeightMapping.checkbox)) {
    trySetCheckbox(form, fieldName, k === answers.maxHeight);
  }

  // Outside security company used (single Yes-style checkbox; no separate "No")
  trySetCheckbox(form, axelOutsideSecurityCompanyCheckbox, answers.outsideSecurityCompanyUsed === "yes");

  form.flatten();
  return await pdf.save();
}

/** Fill the Trean Cannabis Supplemental template from canonical answers. */
export async function fillTreanSupp(rawAnswers: unknown): Promise<Uint8Array> {
  const answers = cannabisApplicationAnswersSchema.parse(rawAnswers);
  const { bytes, updatedCache } = await loadTemplate(TREAN_SUPP_TEMPLATE, treanTemplateCache);
  treanTemplateCache = updatedCache;
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();

  for (const [canonicalKey, mapping] of Object.entries(treanMapping)) {
    if (!mapping) continue;
    const raw = answers[canonicalKey as keyof CannabisApplicationAnswers];
    if (raw === undefined || raw === null) continue;
    if (mapping.kind === "text") {
      trySetText(form, mapping.pdfField, String(raw));
    } else if (mapping.kind === "checkbox") {
      trySetCheckbox(form, mapping.pdfField, raw === true);
    } else if (mapping.kind === "radio") {
      const optionLabel = mapping.options[String(raw)];
      if (optionLabel) trySetRadio(form, mapping.pdfField, optionLabel);
    }
  }

  // Special: vehicle maintenance enum maps to one of three checkboxes
  const vmKey = answers.vehicleMaintenance;
  for (const [k, fieldName] of Object.entries(treanVehicleMaintenanceCheckboxes)) {
    trySetCheckbox(form, fieldName, k === vmKey);
  }

  // Special: safety training enum lights both the radio (handled above) AND a sub-checkbox
  if (answers.safetyTraining === "documented") {
    trySetCheckbox(form, treanSafetyTrainingCheckboxes.documented, true);
  } else if (answers.safetyTraining === "verbal") {
    trySetCheckbox(form, treanSafetyTrainingCheckboxes.verbal, true);
  }

  // Historical premiums table — rows in order of `historicalPremiums` array,
  // up to 6 rows × 3 columns (Payroll, Premium, SubCosts).
  const histRows = answers.historicalPremiums.slice(0, 6);
  for (let row = 0; row < histRows.length; row++) {
    const r = histRows[row];
    const rowIdx = row as 0 | 1 | 2 | 3 | 4 | 5;
    trySetText(form, treanHistoricalTableField(0, rowIdx), r.payroll);
    trySetText(form, treanHistoricalTableField(1, rowIdx), r.premium);
    trySetText(form, treanHistoricalTableField(2, rowIdx), r.subCosts);
  }

  // Signature confirmation checkbox — checked if a signatory name is present.
  if (answers.signatoryName) {
    trySetCheckbox(form, treanSignatureConfirmCheckbox, true);
  }

  form.flatten();
  return await pdf.save();
}
