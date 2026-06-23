import Anthropic from "@anthropic-ai/sdk";
import {
  calculateWCPremium,
  calculateMultiLocationWC,
  type MultiLocationInput,
} from "./ratingEngine";

/**
 * P6 iteration 2 — AI quote-variation engine.
 *
 * Given a deal's CURRENT saved quote, propose a handful of alternative pricing
 * scenarios by adjusting underwriting levers (experience modifier, schedule
 * rating credit, and PEO program). Anthropic decides WHICH scenarios make sense
 * for this specific deal and writes a one-line rationale; the actual premiums are
 * always computed by the real rating engine so the numbers stay bindable.
 *
 * If the AI call fails for any reason we fall back to deterministic presets so
 * the card always renders something useful.
 */

/** Allowed levers a variation may adjust. */
export interface VariationLevers {
  eMod: number;
  scheduleRating: number;
  isPEO: boolean;
}

/** A single proposed scenario before pricing. */
interface ProposedScenario {
  label: string;
  rationale: string;
  levers: VariationLevers;
}

/** A priced variation returned to the client. */
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

/** Base quote inputs extracted from the saved quote row. */
export interface VariationBaseInputs {
  /** Single-location WC inputs (present when the quote is single-location). */
  single?: {
    state: string;
    classCode: string;
    annualPayroll: number;
    zip?: string;
  };
  /** Multi-location input (present when the quote used a workforce profile). */
  multi?: Omit<MultiLocationInput, "eMod" | "scheduleRating" | "isPEO">;
  levers: VariationLevers;
}

export interface DealContext {
  businessName?: string | null;
  vertical?: string | null;
  productType?: string | null;
  annualPayroll?: number | null;
  yearsInBusiness?: number | null;
  hasPriorCoverage?: boolean | null;
  lapseInCoverage?: boolean | null;
}

const getClient = () =>
  new Anthropic({
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  });

function clampEMod(v: number): number {
  return Math.max(0.5, Math.min(2.0, Math.round(v * 1000) / 1000));
}

function clampSchedule(v: number): number {
  return Math.max(0.5, Math.min(2.0, Math.round(v * 1000) / 1000));
}

/** Strictly parse a possibly-stringified boolean (the model may emit "false"). */
function parseBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
  }
  return fallback;
}

/** Compute the WC premium for a given lever set against the base inputs. */
async function priceScenario(base: VariationBaseInputs, levers: VariationLevers): Promise<number> {
  if (base.multi) {
    const result = await calculateMultiLocationWC({
      ...base.multi,
      eMod: levers.eMod,
      scheduleRating: levers.scheduleRating,
      isPEO: levers.isPEO,
    });
    return result.finalPremium;
  }
  if (base.single) {
    const result = await calculateWCPremium({
      state: base.single.state,
      classCode: base.single.classCode,
      annualPayroll: base.single.annualPayroll,
      zip: base.single.zip,
      eMod: levers.eMod,
      scheduleRating: levers.scheduleRating,
      isPEO: levers.isPEO,
    });
    return result.result.wcPremium;
  }
  throw new Error("No base inputs to price");
}

/** Deterministic preset scenarios used as a fallback (and to seed the AI). */
function presetScenarios(levers: VariationLevers): ProposedScenario[] {
  const scenarios: ProposedScenario[] = [];

  if (!levers.isPEO) {
    scenarios.push({
      label: "PEO Program",
      rationale: "Place the account on a PEO program to apply the 10% WC discount.",
      levers: { ...levers, isPEO: true },
    });
  }

  if (levers.scheduleRating >= 0.95) {
    scenarios.push({
      label: "Schedule Credit",
      rationale: "Apply a 10% schedule-rating credit for a well-managed risk.",
      levers: { ...levers, scheduleRating: clampSchedule(levers.scheduleRating - 0.1) },
    });
  }

  if (levers.eMod > 0.85) {
    scenarios.push({
      label: "Improved Experience",
      rationale: "Price the account as if a cleaner loss history lowered the experience modifier.",
      levers: { ...levers, eMod: clampEMod(levers.eMod - 0.1) },
    });
  }

  return scenarios.slice(0, 4);
}

/** Ask Anthropic to choose scenarios; returns [] on any failure. */
async function aiScenarios(base: VariationBaseInputs, ctx: DealContext): Promise<ProposedScenario[]> {
  try {
    const client = getClient();
    const prompt = `You are a workers' compensation underwriter assistant. Given a deal's current quote inputs, propose 2-3 realistic alternative pricing scenarios by adjusting ONLY these levers:
- eMod (experience modifier, 0.5-2.0): lower it only if a cleaner loss history is plausible.
- scheduleRating (0.5-2.0): apply a credit (lower) for a well-managed risk, or a debit (higher) for a riskier one.
- isPEO (boolean): turning this on applies a 10% WC discount (PEO program placement).

Current inputs: eMod=${base.levers.eMod}, scheduleRating=${base.levers.scheduleRating}, isPEO=${base.levers.isPEO}.
Deal context: business="${ctx.businessName ?? ""}", vertical="${ctx.vertical ?? ""}", product="${ctx.productType ?? ""}", annualPayroll=${ctx.annualPayroll ?? ""}, yearsInBusiness=${ctx.yearsInBusiness ?? ""}, hasPriorCoverage=${ctx.hasPriorCoverage ?? ""}, lapseInCoverage=${ctx.lapseInCoverage ?? ""}.

Return ONLY a JSON array of up to 3 objects, each with:
- "label": short scenario name (max 4 words)
- "rationale": one sentence explaining why this fits THIS deal (max 160 chars)
- "eMod": number 0.5-2.0
- "scheduleRating": number 0.5-2.0
- "isPEO": boolean

Each scenario must differ from the current inputs in at least one lever. Return ONLY the JSON array.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return (parsed as unknown[])
      .slice(0, 3)
      .map((raw): ProposedScenario => {
        const s = (raw ?? {}) as Record<string, unknown>;
        return {
          label: String(s.label || "Variation").slice(0, 40),
          rationale: String(s.rationale || "").slice(0, 200),
          levers: {
            eMod: clampEMod(Number(s.eMod) || base.levers.eMod),
            scheduleRating: clampSchedule(Number(s.scheduleRating) || base.levers.scheduleRating),
            isPEO: parseBool(s.isPEO, base.levers.isPEO),
          },
        };
      })
      .filter(
        (s) =>
          s.levers.eMod !== base.levers.eMod ||
          s.levers.scheduleRating !== base.levers.scheduleRating ||
          s.levers.isPEO !== base.levers.isPEO,
      );
  } catch {
    return [];
  }
}

/**
 * Generate priced quote variations for a deal. Tries AI first, falls back to
 * deterministic presets. The base premium is the deal's already-stored quote
 * premium (passed in) so the card never re-rates — and stays consistent with
 * what the rest of the deal card shows. Variations are priced by the real
 * rating engine; any that fail to re-rate are skipped.
 */
export async function generateQuoteVariations(
  base: VariationBaseInputs,
  ctx: DealContext,
  basePremium: number,
): Promise<{ basePremium: number; variations: QuoteVariation[]; usedAi: boolean }> {
  let proposed = await aiScenarios(base, ctx);
  const usedAi = proposed.length > 0;
  if (!usedAi) proposed = presetScenarios(base.levers);

  const variations: QuoteVariation[] = [];
  const seen = new Set<string>();
  for (const p of proposed) {
    const key = `${p.levers.eMod}|${p.levers.scheduleRating}|${p.levers.isPEO}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let premium: number;
    try {
      premium = await priceScenario(base, p.levers);
    } catch {
      continue;
    }
    const delta = Math.round((premium - basePremium) * 100) / 100;
    variations.push({
      id: key,
      label: p.label,
      rationale: p.rationale,
      source: usedAi ? "ai" : "preset",
      changes: p.levers,
      premium,
      delta,
      deltaPct: basePremium > 0 ? Math.round((delta / basePremium) * 1000) / 10 : 0,
    });
  }

  return { basePremium, variations, usedAi };
}
