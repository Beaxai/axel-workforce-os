import { createHash } from "node:crypto";
import type { CannabisApplicationAnswers } from "@workspace/cannabis-application";
import type { RatingInput, WcRatingUnit } from "./market-routing";

export interface CanonicalRoutingFacts {
  states: string[];
  classCodes: string[];
  ratingUnits: WcRatingUnit[];
  annualPayroll: number;
  headcount: number;
  eMod: number;
}

interface SubmittedIndicationSource {
  statesOfOperation?: unknown;
  totalPayroll?: unknown;
  totalEmployees?: unknown;
  experienceMod?: unknown;
  workforceProfile?: unknown;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashCanonicalApplicationAnswers(
  answers: CannabisApplicationAnswers,
): string {
  return createHash("sha256").update(stableJson(answers)).digest("hex");
}

export function deriveCanonicalRoutingFacts(
  answers: CannabisApplicationAnswers,
): CanonicalRoutingFacts {
  const stateByLocation = new Map(
    answers.locations.map((location) => [
      location.loc.trim(),
      location.state.trim().toUpperCase(),
    ]),
  );
  const states = [
    ...new Set(
      answers.locations.map((location) => location.state.trim().toUpperCase()),
    ),
  ].sort();
  const ratingUnits = answers.classCodes.map((row) => ({
    state: stateByLocation.get(row.loc.trim())!,
    classCode: row.classCode.trim(),
    annualPayroll: Number(row.annualPayroll),
  }));
  const classCodes = [
    ...new Set(ratingUnits.map((unit) => unit.classCode)),
  ].sort();

  return {
    states,
    classCodes,
    ratingUnits,
    annualPayroll: ratingUnits.reduce(
      (total, unit) => total + unit.annualPayroll,
      0,
    ),
    headcount: Number(answers.totalEmployeesAll),
    eMod:
      answers.experienceModifier.trim() === ""
        ? 1
        : Number(answers.experienceModifier),
  };
}

function normalizeUnitsFromProfile(profile: unknown): WcRatingUnit[] | null {
  if (!profile || typeof profile !== "object") return null;
  const locations = (profile as { locations?: unknown }).locations;
  if (!Array.isArray(locations)) return null;
  const units: WcRatingUnit[] = [];
  for (const location of locations) {
    if (!location || typeof location !== "object") return null;
    const state = String((location as { state?: unknown }).state ?? "")
      .trim()
      .toUpperCase();
    const classCodes = (location as { classCodes?: unknown }).classCodes;
    if (!/^[A-Z]{2}$/.test(state) || !Array.isArray(classCodes)) return null;
    for (const row of classCodes) {
      if (!row || typeof row !== "object") return null;
      const classCode = String(
        (row as { classCode?: unknown }).classCode ?? "",
      ).trim();
      const annualPayroll = Number(
        (row as { annualPayroll?: unknown }).annualPayroll,
      );
      if (!classCode || !Number.isFinite(annualPayroll)) return null;
      units.push({ state, classCode, annualPayroll });
    }
  }
  return units;
}

function unitKeys(units: WcRatingUnit[]): string[] {
  return units
    .map(
      (unit) =>
        `${unit.state.toUpperCase()}|${unit.classCode}|${unit.annualPayroll.toFixed(2)}`,
    )
    .sort();
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The indication and application are built independently in the browser. Fail
 * closed if their rating facts diverge, then use the canonical facts for
 * ranking. This prevents a valid PDF package from being paired with pricing
 * calculated for different locations, class codes, payroll, or modifiers.
 */
export function findCanonicalIndicationMismatches(
  answers: CannabisApplicationAnswers,
  source: SubmittedIndicationSource,
): string[] {
  const canonical = deriveCanonicalRoutingFacts(answers);
  const mismatches: string[] = [];
  const suppliedUnits = normalizeUnitsFromProfile(source.workforceProfile);
  if (
    !suppliedUnits ||
    JSON.stringify(unitKeys(suppliedUnits)) !==
      JSON.stringify(unitKeys(canonical.ratingUnits))
  ) {
    mismatches.push("workforceProfile locations/class codes/payroll");
  }

  const suppliedPayroll = finiteNumber(source.totalPayroll);
  if (
    suppliedPayroll == null ||
    Math.abs(suppliedPayroll - canonical.annualPayroll) > 0.01
  ) {
    mismatches.push("totalPayroll");
  }
  const suppliedHeadcount = finiteNumber(source.totalEmployees);
  if (
    suppliedHeadcount == null ||
    suppliedHeadcount !== canonical.headcount
  ) {
    mismatches.push("totalEmployees");
  }
  const suppliedEMod = finiteNumber(source.experienceMod) ?? 1;
  if (Math.abs(suppliedEMod - canonical.eMod) > 0.0001) {
    mismatches.push("experienceMod");
  }

  const suppliedStates = Array.isArray(source.statesOfOperation)
    ? [
        ...new Set(
          source.statesOfOperation
            .map((state) => String(state).trim().toUpperCase())
            .filter((state) => /^[A-Z]{2}$/.test(state)),
        ),
      ].sort()
    : [];
  if (
    JSON.stringify(suppliedStates) !== JSON.stringify(canonical.states)
  ) {
    mismatches.push("statesOfOperation");
  }
  return mismatches;
}

export function buildCanonicalRatingInput(
  answers: CannabisApplicationAnswers,
  options: {
    productLane: "WC" | "PEO";
    effectiveDate: string;
    vertical?: string | null;
    scheduleRating: number;
    applicationSnapshotHash: string;
  },
): RatingInput {
  const facts = deriveCanonicalRoutingFacts(answers);
  return {
    productLane: options.productLane,
    effectiveDate: options.effectiveDate,
    states: facts.states,
    vertical: options.vertical ?? null,
    classCodes: facts.classCodes,
    ratingUnits: facts.ratingUnits,
    annualPayroll: facts.annualPayroll,
    headcount: facts.headcount,
    eMod: facts.eMod,
    scheduleRating: options.scheduleRating,
    applicationSnapshotHash: options.applicationSnapshotHash,
  };
}

export interface PersistedRoutingPackageSnapshot {
  version: 1;
  applicationHash: string;
  ratingInput: Record<string, unknown>;
}

export function readPersistedRoutingPackageSnapshot(
  value: unknown,
): PersistedRoutingPackageSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = (value as { routingPackageSnapshot?: unknown })
    .routingPackageSnapshot;
  if (!snapshot || typeof snapshot !== "object") return null;
  const record = snapshot as Record<string, unknown>;
  if (
    record.version !== 1 ||
    typeof record.applicationHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(record.applicationHash) ||
    !record.ratingInput ||
    typeof record.ratingInput !== "object"
  ) {
    return null;
  }
  return snapshot as PersistedRoutingPackageSnapshot;
}