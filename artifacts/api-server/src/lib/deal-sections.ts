/**
 * Phase 4C — Deal Card submission sections.
 *
 * The deal card groups every captured submission field into exactly six
 * sections. Fields derive from the deal record + linked account + latest quote
 * (the same records the rating engine and the 4A account profile read — no
 * shadow copies). Completeness is computed HERE on the server and returned in
 * the payload; the client only renders it (spec §4).
 */
import type { Account, Deal } from "@workspace/db";

export type SectionKey =
  | "business"
  | "locations"
  | "workforce"
  | "operations"
  | "loss"
  | "coverage";

export type SectionStatus = "complete" | "partial" | "not_started";

export type PartyRole =
  | "ADMIN"
  | "CSA"
  | "AGENT"
  | "UNDERWRITER"
  | "EMPLOYER"
  | "CARRIER"
  | "PEO"
  | "VENDOR";

export type FieldType = "text" | "number" | "date" | "boolean" | "array";

export interface FieldDef {
  /** Identifier used by the client and accepted by PATCH. Matches the drizzle
   * column property on its source table. */
  key: string;
  label: string;
  source: "deal" | "account" | "computed";
  type: FieldType;
  required?: boolean;
  ratingRelevant?: boolean;
  /** Derived/managed elsewhere (e.g. class codes from the quote flow, loss-run
   * upload state) — shown but never directly editable on the card. */
  readOnly?: boolean;
}

export interface SectionDef {
  key: SectionKey;
  label: string;
  icon: string;
  fields: FieldDef[];
}

export const SECTION_DEFS: SectionDef[] = [
  {
    key: "business",
    label: "Business Info",
    icon: "ti-building",
    fields: [
      { key: "businessName", label: "Business name", source: "deal", type: "text", required: true },
      { key: "legalName", label: "Legal name", source: "account", type: "text" },
      { key: "dba", label: "DBA", source: "account", type: "text" },
      { key: "fein", label: "FEIN", source: "deal", type: "text", required: true },
      { key: "entityType", label: "Entity type", source: "deal", type: "text", required: true },
      { key: "yearsInBusiness", label: "Years in business", source: "deal", type: "number" },
      { key: "website", label: "Website", source: "deal", type: "text" },
    ],
  },
  {
    key: "locations",
    label: "Locations",
    icon: "ti-map-pin",
    fields: [
      { key: "state", label: "Primary state", source: "deal", type: "text", required: true, ratingRelevant: true },
      { key: "statesOfOperation", label: "States of operation", source: "deal", type: "array", ratingRelevant: true },
      { key: "numberOfLocations", label: "# of locations", source: "deal", type: "number", required: true, ratingRelevant: true },
      { key: "multipleStates", label: "Multiple states", source: "deal", type: "boolean" },
    ],
  },
  {
    key: "workforce",
    label: "Workforce",
    icon: "ti-users",
    fields: [
      { key: "employeeCountFt", label: "Full-time employees", source: "deal", type: "number", required: true, ratingRelevant: true },
      { key: "employeeCountPt", label: "Part-time employees", source: "deal", type: "number", ratingRelevant: true },
      { key: "annualPayroll", label: "Annual payroll", source: "deal", type: "number", required: true, ratingRelevant: true },
      { key: "emod", label: "Experience mod (EMod)", source: "deal", type: "number", required: true, ratingRelevant: true },
      { key: "classCodes", label: "Class codes", source: "account", type: "array", ratingRelevant: true, readOnly: true },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    icon: "ti-settings",
    fields: [
      { key: "descriptionOfOperations", label: "Description of operations", source: "deal", type: "text", required: true },
      { key: "vertical", label: "Industry vertical", source: "deal", type: "text", required: true },
      { key: "naics", label: "NAICS code", source: "account", type: "text" },
    ],
  },
  {
    key: "loss",
    label: "Loss History",
    icon: "ti-history",
    fields: [
      { key: "hasPriorCoverage", label: "Has prior coverage", source: "deal", type: "boolean", required: true },
      { key: "nonRenewed", label: "Non-renewed", source: "deal", type: "boolean" },
      { key: "lapseInCoverage", label: "Lapse in coverage", source: "deal", type: "boolean" },
      { key: "lossRunsUploaded", label: "Loss runs uploaded", source: "computed", type: "boolean", required: true, readOnly: true },
    ],
  },
  {
    key: "coverage",
    label: "Coverage / Program",
    icon: "ti-file-description",
    fields: [
      { key: "productType", label: "Product / program type", source: "deal", type: "text", required: true },
      { key: "coverageEffectiveDate", label: "Effective date", source: "deal", type: "date", required: true },
    ],
  },
];

/** Rating-relevant field keys — editing any of these stales the rating (§6). */
export const RATING_RELEVANT_KEYS = new Set<string>(
  SECTION_DEFS.flatMap((s) => s.fields.filter((f) => f.ratingRelevant).map((f) => f.key)),
);

/** Sections an EMPLOYER may edit on their own deal (spec §8). */
const EMPLOYER_EDITABLE: SectionKey[] = ["business", "locations", "workforce", "operations"];

export interface DealCardActor {
  id: string;
  role: PartyRole;
  orgId?: string | null;
}

export function isOwnDeal(deal: Deal, actor: DealCardActor): boolean {
  if (actor.role === "AGENT") {
    return deal.ownerId === actor.id || deal.producingAgentId === actor.id;
  }
  if (actor.role === "EMPLOYER") {
    return !!deal.orgId && deal.orgId === actor.orgId;
  }
  return false;
}

/** Server-enforced edit access for a section (spec §8). */
export function canEditSection(section: SectionKey, deal: Deal, actor: DealCardActor): boolean {
  switch (actor.role) {
    case "ADMIN":
    case "CSA":
      return true;
    case "AGENT":
      return isOwnDeal(deal, actor);
    case "EMPLOYER":
      return isOwnDeal(deal, actor) && EMPLOYER_EDITABLE.includes(section);
    case "UNDERWRITER":
    case "CARRIER":
    case "PEO":
    case "VENDOR":
    default:
      return false;
  }
}

function rawValue(field: FieldDef, deal: Deal, account: Account | null, lossRunsUploaded: boolean): unknown {
  if (field.source === "computed") {
    if (field.key === "lossRunsUploaded") return lossRunsUploaded;
    return null;
  }
  const src = field.source === "deal" ? (deal as Record<string, unknown>) : ((account ?? {}) as Record<string, unknown>);
  return src[field.key] ?? null;
}

function isPresent(value: unknown, type: FieldType): boolean {
  if (value == null) return false;
  if (type === "array") return Array.isArray(value) && value.length > 0;
  if (type === "boolean") return true; // an explicit true/false is an answer
  if (type === "number") return value !== "" && !Number.isNaN(Number(value));
  return String(value).trim().length > 0;
}

export interface SectionField {
  key: string;
  label: string;
  type: FieldType;
  value: unknown;
  required: boolean;
  ratingRelevant: boolean;
  readOnly: boolean;
}

export interface SectionView {
  key: SectionKey;
  label: string;
  icon: string;
  status: SectionStatus;
  missing: number;
  fields: SectionField[];
}

export function buildSections(
  deal: Deal,
  account: Account | null,
  lossRunsUploaded: boolean,
): { sections: SectionView[]; aggregateComplete: number; total: number } {
  const sections = SECTION_DEFS.map((def): SectionView => {
    const fields: SectionField[] = def.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      value: rawValue(f, deal, account, lossRunsUploaded),
      required: !!f.required,
      ratingRelevant: !!f.ratingRelevant,
      readOnly: !!f.readOnly,
    }));

    const required = fields.filter((f) => f.required);
    const requiredPresent = required.filter((f) => isPresent(f.value, f.type)).length;
    const anyPresent = fields.some((f) => isPresent(f.value, f.type));

    let status: SectionStatus;
    if (required.length > 0 && requiredPresent === required.length) status = "complete";
    else if (!anyPresent) status = "not_started";
    else status = "partial";

    const missing = Math.max(required.length - requiredPresent, status === "partial" ? 1 : 0);
    return { key: def.key, label: def.label, icon: def.icon, status, missing, fields };
  });

  const aggregateComplete = sections.filter((s) => s.status === "complete").length;
  return { sections, aggregateComplete, total: sections.length };
}

export function getSectionDef(section: string): SectionDef | undefined {
  return SECTION_DEFS.find((s) => s.key === section);
}
