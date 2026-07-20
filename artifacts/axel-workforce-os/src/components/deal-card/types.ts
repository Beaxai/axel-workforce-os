/**
 * Phase 4C — Deal Card hub shared types.
 *
 * These mirror the server payloads returned by the /deal-card router. The
 * server is the source of truth for section completeness and edit access; the
 * client only renders what it is given (spec §4 / §8).
 */

export type SectionKey =
  | "business"
  | "locations"
  | "workforce"
  | "operations"
  | "loss"
  | "coverage";

export type SectionStatus = "complete" | "partial" | "not_started";
export type FieldType = "text" | "number" | "date" | "boolean" | "array";

export interface SectionFieldView {
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
  fields: SectionFieldView[];
}

export interface SubmissionDeal {
  id: string;
  referenceCode?: string;
  businessName?: string;
  vertical?: string;
  productType?: string;
  state?: string;
  annualPayroll?: string;
  employeeCountFt?: number;
  numberOfLocations?: number;
  emod?: string;
  stage?: string;
  wcPremium?: string;
  wfsPepmRate?: string;
  bindStatus?: string;
  coverageEffectiveDate?: string;
  ratingStale?: boolean;
  [key: string]: unknown;
}

export interface DealTeamMember {
  userId: string;
  name: string;
  relation: string;
  avatarUrl?: string | null;
}

/** Scoped participant directory returned with the submission payload —
 * available to every role that can view the deal card (unlike GET /api/users,
 * which is internal-sales gated). Used for @mention candidates + avatar
 * resolution. */
export interface DealDirectoryEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string | null;
}

export interface SubmissionPayload {
  deal: SubmissionDeal;
  account: Record<string, unknown> | null;
  sections: SectionView[];
  aggregateComplete: number;
  total: number;
  access: Record<string, boolean>;
  canApprove: boolean;
  team?: DealTeamMember[];
  directory?: DealDirectoryEntry[];
}

export interface ActivityRow {
  id: string;
  description: string;
  eventType: string;
  createdAt?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type RfiStatus = "OPEN" | "RESOLVED" | "WAIVED";

export interface RfiRow {
  id: string;
  dealId: string;
  subject: string;
  detail?: string | null;
  status: RfiStatus;
  blocking: boolean;
  internal: boolean;
  dueAt?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolvedByName?: string | null;
  resolutionNote?: string | null;
  createdAt?: string | null;
}

export interface RfiListResponse {
  rfis: RfiRow[];
  openBlocking: number;
}

export interface VariationLevers {
  eMod: number;
  scheduleRating: number;
  isPEO: boolean;
}

export interface QuoteVariation {
  id: string;
  label: string;
  rationale: string;
  source: "ai" | "preset";
  changes: VariationLevers;
  premium: number;
  delta: number;
  deltaPct: number;
}

export interface QuoteVariationsResponse {
  hasQuote: boolean;
  basePremium: number;
  baseLevers?: VariationLevers;
  usedAi: boolean;
  variations: QuoteVariation[];
}

export interface PreviewVariationResponse {
  premium: number;
  basePremium: number;
  delta: number;
  deltaPct: number;
  levers: VariationLevers;
}

export interface ApplyVariationResponse {
  success: boolean;
  premium: number;
  levers: VariationLevers;
}

export interface SectionPatchResponse {
  success: boolean;
  changed?: boolean;
  ratingStale?: boolean | null;
  diffs?: Array<{ field: string; label: string; from: unknown; to: unknown }>;
  sections?: SectionView[];
  aggregateComplete?: number;
  total?: number;
  deal?: SubmissionDeal;
}
