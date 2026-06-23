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

export interface SubmissionPayload {
  deal: SubmissionDeal;
  account: Record<string, unknown> | null;
  sections: SectionView[];
  aggregateComplete: number;
  total: number;
  access: Record<string, boolean>;
  canApprove: boolean;
}

export interface ActivityRow {
  id: string;
  description: string;
  eventType: string;
  createdAt?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown> | null;
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
