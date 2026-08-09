/**
 * Read-only replica of the quote-flow Step 4 "Pricing Indication" screen,
 * rendered from a saved quote's wcRatingBreakdown + workforceProfile.
 * Used in the deal card Quote tab so brokers see the same interface they
 * saw when they received their estimate.
 */
import { useThemeColors } from "@/lib/use-theme-colors";
import wcShieldIcon from "@assets/Shield-Icon_1780952893965.png";

interface ClassCodeBreakdown {
  classCode: string;
  description?: string;
  annualPayroll: number;
  baseRate?: number;
  premium?: number;
  error?: string;
}

interface LocationBreakdown {
  state: string;
  classCodes: ClassCodeBreakdown[];
  subtotal: number;
  caTerritory?: number | null;
  caTerritoryMultiplier?: number;
  subtotalBeforeTerritory?: number;
}

export interface WcRatingBreakdown {
  locations: LocationBreakdown[];
  totalGrossPremium?: number;
  minimumPremiumApplied?: boolean;
  peoDiscountAmount?: number;
  finalPremium: number;
  eMod?: number;
  scheduleRating?: number;
  isPEO?: boolean;
  calculatedAt?: string;
}

interface WorkforceProfile {
  locations?: Array<{
    state?: string;
    zip?: string;
    classCodes?: Array<{
      classCode?: string;
      annualPayroll?: number;
      fullTimeEmployees?: number;
      partTimeEmployees?: number;
    }>;
  }>;
  eMod?: number;
  scheduleRating?: number;
  isPEO?: boolean;
}

interface IndicationBreakdownPanelProps {
  businessName: string;
  wcBreakdown: WcRatingBreakdown;
  workforceProfile?: WorkforceProfile | null;
  indicationLow?: number | null;
  indicationHigh?: number | null;
  finalPremiumFallback?: number | null;
  ratedAt?: string;
  vertical?: string;
  productType?: string;
  coverageEffectiveDate?: string | null;
  /** WC-2: Axel broker fee shown on the proposal/indication (percent of WC premium). */
  brokerFee?: { percent: number; amount: number | null } | null;
}

export default function IndicationBreakdownPanel({
  businessName,
  wcBreakdown,
  workforceProfile,
  indicationLow,
  indicationHigh,
  finalPremiumFallback,
  ratedAt,
  vertical,
  productType,
  coverageEffectiveDate,
  brokerFee,
}: IndicationBreakdownPanelProps) {
  const { isDark, textPrimary, textSecondary, textMuted, borderColor } = useThemeColors();

  const num = (v: unknown, fallback = 0): number => {
    const n = typeof v === "string" ? parseFloat(v) : (v as number);
    return typeof n === "number" && isFinite(n) ? n : fallback;
  };

  const locs = Array.isArray(wcBreakdown.locations) ? wcBreakdown.locations : [];
  const eMod = num(workforceProfile?.eMod ?? wcBreakdown.eMod, 1.0);
  const isPEO = workforceProfile?.isPEO ?? wcBreakdown.isPEO ?? false;
  const finalPremium = num(wcBreakdown.finalPremium, num(finalPremiumFallback, 0));
  const totalPremium = Math.round(num(wcBreakdown.totalGrossPremium, finalPremium));

  // Flatten class-code rows across locations
  const rows = locs.flatMap((loc, locIdx) =>
    (loc.classCodes || []).map((cc) => ({ locIdx, state: loc.state, ...cc })),
  );

  const totalPayroll = rows.reduce((sum, r) => sum + num(r.annualPayroll), 0);
  const classCodeCount = rows.length;
  const stateCount = new Set(locs.map((l) => l.state).filter(Boolean)).size || 1;
  const premiumLow = indicationLow != null && isFinite(indicationLow)
    ? Math.round(indicationLow)
    : Math.max(500, Math.round(finalPremium * 0.9));
  const premiumHigh = indicationHigh != null && isFinite(indicationHigh)
    ? Math.max(premiumLow, Math.round(indicationHigh))
    : Math.max(premiumLow, Math.round(finalPremium * 1.1));

  const coverageLabel = isPEO || productType === "PEO"
    ? "Workforce Solutions Program (PEO)"
    : "Workers' Compensation Insurance";

  const quotedDate = ratedAt || wcBreakdown.calculatedAt;
  const quotedFormatted = (() => {
    if (!quotedDate) return null;
    const d = new Date(quotedDate);
    return isNaN(d.getTime())
      ? null
      : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  })();
  const coverageEffFormatted = (() => {
    if (!coverageEffectiveDate) return null;
    const d = new Date(String(coverageEffectiveDate).includes("T") ? String(coverageEffectiveDate) : `${coverageEffectiveDate}T00:00:00`);
    return isNaN(d.getTime())
      ? null
      : d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  })();

  const panelBg = isDark ? "#13131f" : "#f8f8fc";
  const cardRadius = 14;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "stretch" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "1px solid rgba(233,30,140,0.5)",
                color: "var(--accent-primary)",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: "var(--app-font-heading)",
                whiteSpace: "nowrap",
              }}
            >
              Pricing Indication
            </span>
            {quotedFormatted && (
              <>
                <span style={{ width: 4, height: 4, borderRadius: 2, background: textMuted, display: "inline-block" }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: "var(--app-font-heading)",
                  }}
                >
                  Quoted {quotedFormatted.toUpperCase()}
                </span>
              </>
            )}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: textPrimary, margin: 0, lineHeight: 1.1 }}>
            {businessName || "Untitled Business"}
          </h1>
          <p style={{ fontSize: 15, color: textMuted, margin: "8px 0 0" }}>
            {vertical ? `${vertical} | ` : ""}{coverageLabel}
          </p>
        </div>
        {coverageEffFormatted && (
          <div
            style={{
              color: "var(--accent-primary)",
              fontSize: 17,
              fontWeight: 700,
              whiteSpace: "nowrap",
              paddingTop: 6,
            }}
          >
            Coverage Eff Date {coverageEffFormatted}
          </div>
        )}
      </div>

      {/* Stat cards intentionally removed here — the deal card header KPIs
          (LOCATIONS / EMPLOYEES / PAYROLL / EXMOD) carry these figures and
          open the editable detail views. */}

      {/* Estimated annual premium range */}
      <div
        style={{
          padding: 24,
          borderRadius: cardRadius,
          background: panelBg,
          border: `1px solid ${borderColor}`,
          borderLeft: "3px solid var(--accent-primary)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            fontFamily: "var(--app-font-heading)",
            marginBottom: 8,
          }}
        >
          Estimated Annual Premium Range
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: textPrimary, lineHeight: 1.1 }}>
          ${premiumLow.toLocaleString()} – ${premiumHigh.toLocaleString()}
        </div>
        <p style={{ fontSize: 13, color: textMuted, margin: "8px 0 0" }}>
          Based on ${totalPayroll.toLocaleString()} total payroll across {classCodeCount} class code
          {classCodeCount !== 1 ? "s" : ""} in {stateCount} state{stateCount !== 1 ? "s" : ""} • Experience
          modifier {Number(eMod).toFixed(2)}
        </p>
        <p style={{ fontSize: 13, color: textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>
          Final pricing is subject to underwriting review and may be adjusted through credits or debits based on
          historical loss experience and claims performance.
        </p>
      </div>

      {/* Workers' Compensation Pricing hero */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: panelBg,
          borderLeft: "3px solid var(--accent-primary)",
        }}
      >
        <h3
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: textPrimary,
            margin: "0 0 16px",
            lineHeight: 1.15,
            fontFamily: "var(--app-font-heading)",
            textTransform: "uppercase",
            letterSpacing: "0.01em",
          }}
        >
          Workers' Compensation Pricing
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(190px, 240px)", gap: 24, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
              Workers' compensation premium is calculated from current filed carrier rates applied to payroll across
              each class code and location, then adjusted for your experience modifier.
            </p>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
              The figure shown reflects your total estimated annual premium and is finalized after underwriting review
              and audit.
            </p>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
              Workers' compensation premiums are seamlessly integrated into payroll processing. Premiums are calculated
              and remitted on a pay-as-you-go basis using actual payroll processed.
            </p>
          </div>
          <div style={{ position: "relative", paddingTop: 40 }}>
            <img
              src={wcShieldIcon}
              alt=""
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 76,
                height: "auto",
                zIndex: 2,
                pointerEvents: "none",
                filter: "drop-shadow(0 8px 24px rgba(233,30,140,0.45))",
              }}
            />
            <div
              style={{
                borderRadius: 20,
                padding: 2,
                background: "var(--accent-primary)",
                boxShadow: "0 0 40px rgba(233,30,140,0.35)",
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  background: "#0a0a12",
                  padding: "32px 20px 18px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  ${totalPremium.toLocaleString()}
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.18)", margin: "12px auto", maxWidth: 150 }} />
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
                  total annual premium
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rate breakdown table */}
      <div
        style={{
          borderRadius: cardRadius,
          background: panelBg,
          borderLeft: "3px solid var(--accent-primary)",
          overflow: "hidden",
          padding: "8px 4px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, margin: "12px 18px 8px" }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: textPrimary,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "var(--app-font-heading)",
              margin: 0,
            }}
          >
            Workers' Compensation Premium Rating
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 13 }}>
            <span style={{ color: textSecondary }}>
              <span style={{ color: textMuted, fontWeight: 600 }}>Carrier:</span> Benchmark
            </span>
            <span style={{ color: textSecondary }}>
              <span style={{ color: textMuted, fontWeight: 600 }}>Rating:</span> A (Excellent)
            </span>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Location", "Class Code", "Description", "Payroll", "Rate", "Est. Premium"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "16px 18px 12px",
                      textAlign: i >= 3 ? "right" : "left",
                      color: textMuted,
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontFamily: "var(--app-font-heading)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: "12px 18px", color: textPrimary, fontWeight: 600, whiteSpace: "nowrap" }}>
                    Loc {row.locIdx + 1} ({row.state})
                  </td>
                  <td style={{ padding: "12px 18px", color: row.error ? "#FFB547" : textPrimary, fontWeight: 600 }}>{row.classCode}</td>
                  <td style={{ padding: "12px 18px", color: textPrimary, fontWeight: 600 }}>{row.description || ""}</td>
                  <td style={{ padding: "12px 18px", color: textPrimary, fontWeight: 600, textAlign: "right" }}>
                    ${num(row.annualPayroll).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 18px", color: row.error ? "#FFB547" : textPrimary, fontWeight: 600, textAlign: "right" }}>
                    ${num(row.baseRate).toFixed(2)}
                    {row.error && <span title={row.error} style={{ marginLeft: 4, cursor: "help" }}>⚠</span>}
                  </td>
                  <td style={{ padding: "12px 18px", color: textPrimary, fontWeight: 700, textAlign: "right" }}>
                    ${Math.round(num(row.premium)).toLocaleString()}
                  </td>
                </tr>
              ))}
              {locs
                .filter((loc) => loc.caTerritory != null && loc.caTerritoryMultiplier !== 1.0)
                .map((loc, i) => (
                  <tr key={`territory-${i}`}>
                    <td colSpan={4} style={{ padding: "10px 18px", color: textMuted, fontSize: 12 }}>
                      CA Territory {loc.caTerritory} Adjustment ({loc.state})
                    </td>
                    <td style={{ padding: "10px 18px", color: textMuted, fontSize: 12, textAlign: "right" }}>
                      x{loc.caTerritoryMultiplier?.toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 18px", color: textSecondary, fontWeight: 600, fontSize: 12, textAlign: "right" }}>
                      {loc.caTerritoryMultiplier != null && loc.caTerritoryMultiplier > 1 ? "+" : ""}
                      {loc.subtotalBeforeTerritory != null
                        ? `$${Math.round(num(loc.subtotal) - num(loc.subtotalBeforeTerritory)).toLocaleString()}`
                        : ""}
                    </td>
                  </tr>
                ))}
              <tr>
                <td colSpan={5} style={{ padding: "16px 18px", color: textPrimary, fontWeight: 700, borderTop: "1px solid var(--accent-primary)" }}>
                  Total
                </td>
                <td style={{ padding: "16px 18px", color: textPrimary, fontWeight: 700, textAlign: "right", borderTop: "1px solid var(--accent-primary)" }}>
                  ${totalPremium.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {(wcBreakdown.minimumPremiumApplied || (isPEO && (wcBreakdown.peoDiscountAmount || 0) > 0)) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {wcBreakdown.minimumPremiumApplied && (
            <p style={{ fontSize: 12, color: "#FFB547", margin: 0 }}>Minimum premium of $500 applied</p>
          )}
          {isPEO && num(wcBreakdown.peoDiscountAmount) > 0 && (
            <p style={{ fontSize: 12, color: "#00D68F", margin: 0 }}>
              PEO discount applied: -${num(wcBreakdown.peoDiscountAmount).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* WC-2: broker fee appears on the proposal */}
      {brokerFee && (
        <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
              Axel Broker Fee ({brokerFee.percent}% of premium)
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>
              {brokerFee.amount != null ? `$${brokerFee.amount.toLocaleString()}` : "—"}
            </span>
          </div>
          <p style={{ fontSize: 12, color: textMuted, margin: "4px 0 0" }}>
            Invoiced separately from carrier premium.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <p style={{ fontSize: 12, color: textMuted, fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>
        This indication is based on the information provided and is not a guarantee of final pricing. Actual premium
        is subject to full underwriting review, carrier approval, and final audit. Rates shown are based on current
        filed carrier rates.
      </p>
    </div>
  );
}
