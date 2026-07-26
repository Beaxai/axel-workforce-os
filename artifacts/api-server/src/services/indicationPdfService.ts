import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Indication Summary PDF — a white/print rendition of the web "Pricing
 * Indication" screen (IndicationBreakdownPanel): same sections, headings, and
 * copy, drawn programmatically with pdf-lib. Generated on demand from the
 * deal row + latest quote snapshot.
 */

export type IndicationPdfInput = {
  businessName: string;
  referenceCode?: string | null;
  state?: string | null;
  fein?: string | null;
  entityType?: string | null;
  vertical?: string | null;
  productType?: string | null;
  coverageEffectiveDate?: string | null;
  premiumLow?: number | null;
  premiumHigh?: number | null;
  eMod?: number | null;
  scheduleRating?: number | null;
  isPeo?: boolean;
  annualPayroll?: number | null;
  headcount?: number | null;
  ratedAt?: string | null;
  breakdown?: unknown;
};

/* ---------------------------------------------------------------- palette */
const PINK = rgb(0.914, 0.118, 0.549); // #E91E8C
const INK = rgb(0.08, 0.08, 0.1);
const SECONDARY = rgb(0.3, 0.3, 0.34);
const MUTED = rgb(0.5, 0.5, 0.55);
const LINE = rgb(0.88, 0.88, 0.9);
const PANEL = rgb(0.972, 0.972, 0.988); // #f8f8fc — same as the web light panel
const AMBER = rgb(0.85, 0.6, 0.12);
const GREEN = rgb(0.0, 0.65, 0.44);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

/* ---------------------------------------------------------------- helpers */
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return v == null || typeof n !== "number" || !isFinite(n) ? null : n;
};
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;

type NormLoc = {
  state: string;
  subtotal: number | null;
  subtotalBeforeTerritory: number | null;
  caTerritory: number | null;
  caTerritoryMultiplier: number | null;
  classCodes: Array<{
    classCode: string;
    description: string;
    annualPayroll: number | null;
    baseRate: number | null;
    premium: number | null;
    error?: string;
  }>;
};

function normalizeBreakdown(raw: unknown): {
  locations: NormLoc[];
  totalGrossPremium: number | null;
  peoDiscountAmount: number | null;
  finalPremium: number | null;
  minimumPremiumApplied: boolean;
  eMod: number | null;
  isPEO: boolean;
} {
  // Some quotes store the breakdown wrapped as { data: {...} } (see proposals.ts).
  const unwrapped =
    raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>) && (raw as Record<string, unknown>).data
      ? (raw as Record<string, unknown>).data
      : raw;
  const b = unwrapped && typeof unwrapped === "object" ? (unwrapped as Record<string, unknown>) : {};
  const locations: NormLoc[] = Array.isArray(b.locations)
    ? (b.locations as unknown[])
        .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
        .map((l) => ({
          state: str(l.state) || "—",
          subtotal: num(l.subtotal),
          subtotalBeforeTerritory: num(l.subtotalBeforeTerritory),
          caTerritory: num(l.caTerritory),
          caTerritoryMultiplier: num(l.caTerritoryMultiplier),
          classCodes: Array.isArray(l.classCodes)
            ? (l.classCodes as unknown[])
                .filter((cc): cc is Record<string, unknown> => !!cc && typeof cc === "object")
                .map((cc) => ({
                  classCode: str(cc.classCode) || "—",
                  description: str(cc.description),
                  annualPayroll: num(cc.annualPayroll),
                  baseRate: num(cc.baseRate),
                  premium: num(cc.premium),
                  error: str(cc.error) || undefined,
                }))
            : [],
        }))
    : [];
  return {
    locations,
    totalGrossPremium: num(b.totalGrossPremium),
    peoDiscountAmount: num(b.peoDiscountAmount),
    finalPremium: num(b.finalPremium),
    minimumPremiumApplied: !!b.minimumPremiumApplied,
    eMod: num(b.eMod),
    isPEO: !!b.isPEO,
  };
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const clip = (s: string, font: PDFFont, size: number, maxWidth: number): string => {
  if (font.widthOfTextAtSize(s, size) <= maxWidth) return s;
  let out = s;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
};

/* ------------------------------------------------------------------ build */
export async function buildIndicationSummaryPdf(input: IndicationPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };
  const text = (s: string, x: number, yy: number, size: number, f: PDFFont, color = INK) =>
    page.drawText(s, { x, y: yy, size, font: f, color });
  const textRight = (s: string, rightX: number, yy: number, size: number, f: PDFFont, color = INK) =>
    page.drawText(s, { x: rightX - f.widthOfTextAtSize(s, size), y: yy, size, font: f, color });

  const bd = normalizeBreakdown(input.breakdown);
  const rows = bd.locations.flatMap((loc, locIdx) =>
    loc.classCodes.map((cc) => ({ locIdx, state: loc.state, ...cc })),
  );
  const eMod = input.eMod ?? bd.eMod ?? 1.0;
  const isPEO = input.isPeo ?? bd.isPEO;
  const finalPremium = bd.finalPremium ?? 0;
  const totalPremium = Math.round(bd.totalGrossPremium ?? finalPremium);
  const totalPayroll = rows.reduce((s, r) => s + (r.annualPayroll ?? 0), 0);
  const classCodeCount = rows.length;
  const stateCount = new Set(bd.locations.map((l) => l.state).filter((s) => s !== "—")).size || 1;
  const premiumLow = input.premiumLow != null ? Math.round(input.premiumLow) : Math.max(500, Math.round(finalPremium * 0.9));
  const premiumHigh = input.premiumHigh != null ? Math.max(premiumLow, Math.round(input.premiumHigh)) : Math.max(premiumLow, Math.round(finalPremium * 1.1));

  const coverageLabel =
    isPEO || input.productType === "PEO"
      ? "Workforce Solutions Program (PEO)"
      : "Workers' Compensation Insurance";

  const quotedDate = input.ratedAt ? new Date(input.ratedAt) : null;
  const quotedFormatted =
    quotedDate && !isNaN(quotedDate.getTime())
      ? quotedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : null;
  const covEff = (() => {
    if (!input.coverageEffectiveDate) return null;
    const s = String(input.coverageEffectiveDate);
    const d = new Date(s.includes("T") ? s : `${s}T00:00:00`);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  })();

  /* ---- header: badge + quoted date ---- */
  const badgeLabel = "PRICING INDICATION";
  const badgeW = bold.widthOfTextAtSize(badgeLabel, 8.5) + 18;
  page.drawRectangle({ x: MARGIN, y: y - 6, width: badgeW, height: 18, borderColor: PINK, borderWidth: 0.9, color: undefined });
  text(badgeLabel, MARGIN + 9, y - 1, 8.5, bold, PINK);
  if (quotedFormatted) {
    text(`•  QUOTED ${quotedFormatted.toUpperCase()}`, MARGIN + badgeW + 10, y - 1, 8.5, bold, MUTED);
  }
  y -= 32;

  /* ---- business name + subtitle, coverage eff date right ---- */
  const nameSize = 22;
  text(clip(input.businessName || "Untitled Business", bold, nameSize, CONTENT_W - 160), MARGIN, y, nameSize, bold);
  if (covEff) textRight(`Coverage Eff Date ${covEff}`, PAGE_W - MARGIN, y + 2, 12, bold, PINK);
  y -= 18;
  text(`${input.vertical ? `${input.vertical} | ` : ""}${coverageLabel}`, MARGIN, y, 11, font, MUTED);
  y -= 28;

  /* ---- Estimated Annual Premium Range card ---- */
  const rangeSubline = `Based on $${totalPayroll.toLocaleString("en-US")} total payroll across ${classCodeCount} class code${classCodeCount !== 1 ? "s" : ""} in ${stateCount} state${stateCount !== 1 ? "s" : ""} • Experience modifier ${Number(eMod).toFixed(2)}`;
  const uwNote =
    "Final pricing is subject to underwriting review and may be adjusted through credits or debits based on historical loss experience and claims performance.";
  const uwNoteLines = wrapText(uwNote, font, 9.5, CONTENT_W - 40);
  const rangeCardH = 78 + uwNoteLines.length * 13;
  ensure(rangeCardH + 10);
  page.drawRectangle({ x: MARGIN, y: y - rangeCardH, width: CONTENT_W, height: rangeCardH, color: PANEL, borderColor: LINE, borderWidth: 0.7 });
  page.drawRectangle({ x: MARGIN, y: y - rangeCardH, width: 3, height: rangeCardH, color: PINK });
  let cy = y - 22;
  text("ESTIMATED ANNUAL PREMIUM RANGE", MARGIN + 20, cy, 8.5, bold, MUTED);
  cy -= 26;
  text(`$${premiumLow.toLocaleString("en-US")} – $${premiumHigh.toLocaleString("en-US")}`, MARGIN + 20, cy, 24, bold);
  cy -= 18;
  text(clip(rangeSubline, font, 9.5, CONTENT_W - 40), MARGIN + 20, cy, 9.5, font, MUTED);
  cy -= 15;
  for (const ln of uwNoteLines) {
    text(ln, MARGIN + 20, cy, 9.5, font, MUTED);
    cy -= 13;
  }
  y -= rangeCardH + 20;

  /* ---- Workers' Compensation Pricing hero ---- */
  const heroParas = [
    "Workers' compensation premium is calculated from current filed carrier rates applied to payroll across each class code and location, then adjusted for your experience modifier.",
    "The figure shown reflects your total estimated annual premium and is finalized after underwriting review and audit.",
    "Workers' compensation premiums are seamlessly integrated into payroll processing. Premiums are calculated and remitted on a pay-as-you-go basis using actual payroll processed.",
  ];
  const heroTextW = CONTENT_W - 200;
  const heroLines = heroParas.map((p) => wrapText(p, font, 9.5, heroTextW - 24));
  const heroTextH = heroLines.reduce((s, l) => s + l.length * 13 + 8, 0);
  const heroH = Math.max(46 + heroTextH, 150);
  ensure(heroH + 12);
  page.drawRectangle({ x: MARGIN, y: y - heroH, width: CONTENT_W, height: heroH, color: PANEL, borderColor: LINE, borderWidth: 0.7 });
  page.drawRectangle({ x: MARGIN, y: y - heroH, width: 3, height: heroH, color: PINK });
  cy = y - 26;
  text("WORKERS' COMPENSATION PRICING", MARGIN + 20, cy, 15, bold);
  cy -= 22;
  for (const para of heroLines) {
    for (const ln of para) {
      text(ln, MARGIN + 20, cy, 9.5, font, SECONDARY);
      cy -= 13;
    }
    cy -= 8;
  }
  // total premium box on the right (white with pink border for print)
  const boxW = 170;
  const boxH = 84;
  const boxX = PAGE_W - MARGIN - boxW - 14;
  const boxY = y - heroH / 2 - boxH / 2;
  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: rgb(1, 1, 1), borderColor: PINK, borderWidth: 1.6 });
  const totalStr = `$${totalPremium.toLocaleString("en-US")}`;
  page.drawText(totalStr, {
    x: boxX + (boxW - bold.widthOfTextAtSize(totalStr, 22)) / 2,
    y: boxY + boxH - 36,
    size: 22, font: bold, color: INK,
  });
  page.drawLine({ start: { x: boxX + 26, y: boxY + 38 }, end: { x: boxX + boxW - 26, y: boxY + 38 }, thickness: 0.7, color: LINE });
  const sub = "total annual premium";
  page.drawText(sub, {
    x: boxX + (boxW - font.widthOfTextAtSize(sub, 9.5)) / 2,
    y: boxY + 20,
    size: 9.5, font, color: MUTED,
  });
  y -= heroH + 20;

  /* ---- Rate breakdown table ---- */
  ensure(60);
  text("WORKERS' COMPENSATION PREMIUM RATING", MARGIN, y, 10, bold);
  const carrierStr = "Carrier: Benchmark    Rating: A (Excellent)";
  textRight(carrierStr, PAGE_W - MARGIN, y, 9, font, SECONDARY);
  y -= 18;

  // Columns: Location | Class Code | Description | Payroll | Rate | Est. Premium
  const col = {
    loc: MARGIN,
    code: MARGIN + 74,
    desc: MARGIN + 138,
    payrollR: MARGIN + 356, // right-aligned edges
    rateR: MARGIN + 416,
    premR: MARGIN + CONTENT_W,
  };
  const descW = 158;

  const drawTableHeader = () => {
    text("LOCATION", col.loc, y, 7.5, bold, MUTED);
    text("CLASS CODE", col.code, y, 7.5, bold, MUTED);
    text("DESCRIPTION", col.desc, y, 7.5, bold, MUTED);
    textRight("PAYROLL", col.payrollR, y, 7.5, bold, MUTED);
    textRight("RATE", col.rateR, y, 7.5, bold, MUTED);
    textRight("EST. PREMIUM", col.premR, y, 7.5, bold, MUTED);
    y -= 7;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.7, color: LINE });
    y -= 15;
  };
  drawTableHeader();

  for (const r of rows) {
    if (y - 16 < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      drawTableHeader();
    }
    text(`Loc ${r.locIdx + 1} (${r.state})`, col.loc, y, 9, bold);
    text(r.classCode, col.code, y, 9, bold, r.error ? AMBER : INK);
    text(clip(r.description || "", font, 9, descW), col.desc, y, 9, font);
    textRight(money(r.annualPayroll), col.payrollR, y, 9, font);
    textRight(r.baseRate != null ? `$${r.baseRate.toFixed(2)}${r.error ? " !" : ""}` : "—", col.rateR, y, 9, font, r.error ? AMBER : INK);
    textRight(money(r.premium), col.premR, y, 9, bold);
    y -= 16;
  }

  // CA territory adjustment rows (matches the web table)
  for (const loc of bd.locations) {
    if (loc.caTerritory != null && loc.caTerritoryMultiplier != null && loc.caTerritoryMultiplier !== 1.0) {
      ensure(16);
      text(`CA Territory ${loc.caTerritory} Adjustment (${loc.state})`, col.loc, y, 8.5, font, MUTED);
      textRight(`x${loc.caTerritoryMultiplier.toFixed(2)}`, col.rateR, y, 8.5, font, MUTED);
      if (loc.subtotalBeforeTerritory != null && loc.subtotal != null) {
        const delta = Math.round(loc.subtotal - loc.subtotalBeforeTerritory);
        const deltaStr = `${delta < 0 ? "-" : "+"}$${Math.abs(delta).toLocaleString("en-US")}`;
        textRight(deltaStr, col.premR, y, 8.5, font, SECONDARY);
      }
      y -= 16;
    }
  }

  // Total row with pink top border
  ensure(26);
  page.drawLine({ start: { x: MARGIN, y: y + 10 }, end: { x: PAGE_W - MARGIN, y: y + 10 }, thickness: 1, color: PINK });
  y -= 4;
  text("Total", col.loc, y, 10, bold);
  textRight(`$${totalPremium.toLocaleString("en-US")}`, col.premR, y, 10, bold);
  y -= 24;

  /* ---- Notes ---- */
  if (bd.minimumPremiumApplied) {
    ensure(14);
    text("Minimum premium of $500 applied", MARGIN, y, 9, font, AMBER);
    y -= 14;
  }
  if (isPEO && (bd.peoDiscountAmount ?? 0) > 0) {
    ensure(14);
    text(`PEO discount applied: -$${Math.round(bd.peoDiscountAmount!).toLocaleString("en-US")}`, MARGIN, y, 9, font, GREEN);
    y -= 14;
  }

  /* ---- Disclaimer ---- */
  const disclaimer =
    "This indication is based on the information provided and is not a guarantee of final pricing. Actual premium is subject to full underwriting review, carrier approval, and final audit. Rates shown are based on current filed carrier rates.";
  const discLines = wrapText(disclaimer, italic, 8.5, CONTENT_W);
  ensure(discLines.length * 12 + 10);
  y -= 6;
  for (const ln of discLines) {
    text(ln, MARGIN, y, 8.5, italic, MUTED);
    y -= 12;
  }

  return doc.save();
}
