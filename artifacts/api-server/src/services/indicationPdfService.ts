import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Indication Summary PDF — generated on demand from the deal's current
 * indication data (deal row + latest quote snapshot). Unlike the application
 * PDFs there is no template on disk; the document is drawn programmatically.
 */

export type IndicationPdfInput = {
  businessName: string;
  referenceCode?: string | null;
  state?: string | null;
  fein?: string | null;
  entityType?: string | null;
  coverageEffectiveDate?: string | null;
  premiumLow?: number | null;
  premiumHigh?: number | null;
  eMod?: number | null;
  scheduleRating?: number | null;
  isPeo?: boolean;
  annualPayroll?: number | null;
  headcount?: number | null;
  ratedAt?: string | null;
  breakdown?: {
    locations?: Array<{
      state: string;
      classCodes: Array<{
        classCode: string;
        description?: string;
        annualPayroll: number;
        baseRate: number;
        premium: number;
        error?: string;
      }>;
      subtotal: number;
    }>;
    totalGrossPremium?: number;
    peoDiscountAmount?: number;
    finalPremium?: number;
    minimumPremiumApplied?: boolean;
  } | null;
};

const PINK = rgb(0.914, 0.118, 0.549); // #E91E8C
const INK = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.45, 0.45, 0.5);
const LINE = rgb(0.85, 0.85, 0.88);

const money = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? "—"
    : `$${Math.round(Number(n)).toLocaleString("en-US")}`;

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v == null || Number.isNaN(n) ? null : n;
};
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/**
 * Normalize a stored wcRatingBreakdown of unknown/legacy shape into the safe
 * subset we render. Wrong shapes degrade to empty sections instead of throwing.
 */
function normalizeBreakdown(raw: IndicationPdfInput["breakdown"]): {
  locations: Array<{
    state: string;
    subtotal: number | null;
    classCodes: Array<{ classCode: string; description: string; annualPayroll: number | null; baseRate: number | null; premium: number | null; error?: string }>;
  }>;
  totalGrossPremium: number | null;
  peoDiscountAmount: number | null;
  finalPremium: number | null;
  minimumPremiumApplied: boolean;
} {
  const b = raw && typeof raw === "object" ? raw : null;
  const locations = Array.isArray(b?.locations)
    ? b.locations
        .filter((l): l is NonNullable<typeof l> => !!l && typeof l === "object")
        .map((l) => ({
          state: str((l as { state?: unknown }).state) || "—",
          subtotal: num((l as { subtotal?: unknown }).subtotal),
          classCodes: Array.isArray(l.classCodes)
            ? l.classCodes
                .filter((cc): cc is NonNullable<typeof cc> => !!cc && typeof cc === "object")
                .map((cc) => ({
                  classCode: str((cc as { classCode?: unknown }).classCode) || "—",
                  description: str((cc as { description?: unknown }).description),
                  annualPayroll: num((cc as { annualPayroll?: unknown }).annualPayroll),
                  baseRate: num((cc as { baseRate?: unknown }).baseRate),
                  premium: num((cc as { premium?: unknown }).premium),
                  error: str((cc as { error?: unknown }).error) || undefined,
                }))
            : [],
        }))
    : [];
  return {
    locations,
    totalGrossPremium: num(b?.totalGrossPremium),
    peoDiscountAmount: num(b?.peoDiscountAmount),
    finalPremium: num(b?.finalPremium),
    minimumPremiumApplied: !!b?.minimumPremiumApplied,
  };
}

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;

export async function buildIndicationSummaryPdf(input: IndicationPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const text = (
    p: PDFPage,
    str: string,
    x: number,
    yy: number,
    size: number,
    f: PDFFont,
    color = INK,
  ) => p.drawText(str, { x, y: yy, size, font: f, color });

  const rule = (yy: number) =>
    page.drawLine({ start: { x: MARGIN, y: yy }, end: { x: PAGE_W - MARGIN, y: yy }, thickness: 0.7, color: LINE });

  /* ---- header ---- */
  text(page, "AXEL WORKFORCE OS", MARGIN, y, 9, bold, PINK);
  y -= 22;
  text(page, "Workers' Compensation Rate Indication", MARGIN, y, 19, bold);
  y -= 15;
  const generatedOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  text(page, `Generated ${generatedOn}${input.referenceCode ? `  •  Ref ${input.referenceCode}` : ""}`, MARGIN, y, 9, font, MUTED);
  y -= 14;
  rule(y);
  y -= 24;

  /* ---- business details ---- */
  const details: Array<[string, string]> = [
    ["Business", clip(input.businessName || "—", 40)],
    ["State", input.state || "—"],
    ["FEIN", input.fein || "—"],
    ["Entity type", input.entityType || "—"],
    ["Coverage effective", input.coverageEffectiveDate ? new Date(input.coverageEffectiveDate).toLocaleDateString("en-US") : "—"],
    ["Annual payroll", money(input.annualPayroll)],
    ["Employees", input.headcount != null ? String(input.headcount) : "—"],
    ["Experience mod", input.eMod != null ? String(input.eMod) : "—"],
    ["Schedule rating", input.scheduleRating != null ? String(input.scheduleRating) : "—"],
    ["PEO", input.isPeo ? "Yes" : "No"],
  ];
  const colW = (PAGE_W - MARGIN * 2) / 2;
  for (let i = 0; i < details.length; i += 2) {
    newPageIfNeeded(20);
    for (let j = 0; j < 2 && i + j < details.length; j++) {
      const [label, value] = details[i + j];
      const x = MARGIN + j * colW;
      text(page, label.toUpperCase(), x, y, 7.5, bold, MUTED);
      text(page, value, x, y - 12, 10.5, font);
    }
    y -= 32;
  }
  y -= 4;

  /* ---- indication range (hero) ---- */
  newPageIfNeeded(70);
  page.drawRectangle({
    x: MARGIN, y: y - 52, width: PAGE_W - MARGIN * 2, height: 58,
    color: rgb(0.98, 0.94, 0.965), borderColor: PINK, borderWidth: 0.8, opacity: 1,
  });
  text(page, "INDICATED PREMIUM RANGE", MARGIN + 16, y - 14, 8, bold, PINK);
  text(
    page,
    `${money(input.premiumLow)}  –  ${money(input.premiumHigh)}`,
    MARGIN + 16,
    y - 38,
    18,
    bold,
  );
  y -= 76;

  /* ---- class code breakdown ---- */
  const bd = normalizeBreakdown(input.breakdown);
  const locations = bd.locations;
  if (locations.length > 0) {
    newPageIfNeeded(40);
    text(page, "Rating Breakdown", MARGIN, y, 13, bold);
    y -= 22;

    const cols = { code: MARGIN, desc: MARGIN + 60, payroll: MARGIN + 260, rate: MARGIN + 360, premium: MARGIN + 430 };
    for (const loc of locations) {
      newPageIfNeeded(36);
      text(page, `Location — ${loc.state}`, MARGIN, y, 9.5, bold, MUTED);
      y -= 16;
      // table header
      text(page, "CODE", cols.code, y, 7.5, bold, MUTED);
      text(page, "DESCRIPTION", cols.desc, y, 7.5, bold, MUTED);
      text(page, "PAYROLL", cols.payroll, y, 7.5, bold, MUTED);
      text(page, "RATE", cols.rate, y, 7.5, bold, MUTED);
      text(page, "PREMIUM", cols.premium, y, 7.5, bold, MUTED);
      y -= 6;
      rule(y);
      y -= 14;

      for (const cc of loc.classCodes) {
        newPageIfNeeded(16);
        text(page, cc.classCode, cols.code, y, 9, font);
        text(page, clip(cc.description, 42) || "—", cols.desc, y, 9, font);
        text(page, money(cc.annualPayroll), cols.payroll, y, 9, font);
        text(page, cc.baseRate != null ? cc.baseRate.toFixed(2) : "—", cols.rate, y, 9, font);
        text(page, cc.error ? "error" : money(cc.premium), cols.premium, y, 9, font, cc.error ? PINK : INK);
        y -= 14;
      }
      newPageIfNeeded(16);
      text(page, "Location subtotal", cols.rate - 90, y, 9, bold, MUTED);
      text(page, money(loc.subtotal), cols.premium, y, 9, bold);
      y -= 22;
    }

    /* totals */
    newPageIfNeeded(60);
    rule(y + 6);
    const totals: Array<[string, string, boolean]> = [];
    if (bd.totalGrossPremium != null) totals.push(["Gross premium", money(bd.totalGrossPremium), false]);
    if (bd.peoDiscountAmount) totals.push(["PEO discount", `-${money(Math.abs(bd.peoDiscountAmount))}`, false]);
    if (bd.finalPremium != null) totals.push(["Final rated premium", money(bd.finalPremium), true]);
    for (const [label, value, strong] of totals) {
      newPageIfNeeded(16);
      text(page, label, MARGIN + 250, y, strong ? 10.5 : 9.5, strong ? bold : font, strong ? INK : MUTED);
      text(page, value, MARGIN + 430, y, strong ? 10.5 : 9.5, strong ? bold : font);
      y -= 16;
    }
    if (bd.minimumPremiumApplied) {
      newPageIfNeeded(14);
      text(page, "Minimum premium applied.", MARGIN + 250, y, 8, font, MUTED);
      y -= 14;
    }
  }

  /* ---- footer disclaimer ---- */
  newPageIfNeeded(48);
  y = Math.min(y, MARGIN + 46);
  rule(y + 10);
  text(
    page,
    "This rate indication is an estimate based on the information provided and is not a quote or an offer of coverage.",
    MARGIN, y - 4, 7.5, font, MUTED,
  );
  text(
    page,
    "Final premium is subject to underwriting review, carrier approval, and verification of payroll and class codes.",
    MARGIN, y - 15, 7.5, font, MUTED,
  );

  return doc.save();
}
