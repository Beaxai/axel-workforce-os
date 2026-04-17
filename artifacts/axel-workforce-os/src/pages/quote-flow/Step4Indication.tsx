import { useThemeColors } from "@/lib/use-theme-colors";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { api } from "@/lib/api";
import { Check, Clock, Shield, Cannabis, Loader2, AlertTriangle } from "lucide-react";

interface MultiLocationResult {
  locations: Array<{
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
    caTerritory?: number | null;
    caTerritoryMultiplier?: number;
    subtotalBeforeTerritory?: number;
  }>;
  totalGrossPremium: number;
  minimumPremiumApplied: boolean;
  peoDiscountAmount: number;
  finalPremium: number;
  eMod: number;
  scheduleRating: number;
  isPEO: boolean;
  calculatedAt: string;
}

export default function Step4Indication() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ratingError, setRatingError] = useState("");
  const [ratingResult, setRatingResult] = useState<MultiLocationResult | null>(null);

  const modifier = s.hasExperienceMod === "Yes" ? parseFloat(s.experienceMod) || 1.0 : 1.0;

  useEffect(() => {
    async function fetchRates() {
      setLoading(true);
      setRatingError("");

      const locationsPayload = s.locations
        .filter((loc) => loc.state && loc.classCodes.some((cc) => cc.classCode))
        .map((loc) => ({
          state: loc.state,
          zip: loc.zip || "",
          classCodes: loc.classCodes
            .filter((cc) => cc.classCode)
            .map((cc) => ({
              classCode: cc.classCode,
              annualPayroll: cc.annualPayroll || 0,
              fullTimeEmployees: cc.fullTimeEmployees || 0,
              partTimeEmployees: cc.partTimeEmployees || 0,
              description: cc.description || "",
            })),
        }));

      if (locationsPayload.length === 0) {
        setRatingError("No valid locations with class codes to rate.");
        setLoading(false);
        return;
      }

      try {
        const res = await api.post<{ success: boolean; data: MultiLocationResult; error?: string }>("/rate/wc/multi", {
          locations: locationsPayload,
          eMod: modifier,
          scheduleRating: 1.0,
          isPEO: false,
        });

        if (!res.success) {
          setRatingError(res.error || "Rating calculation failed.");
          setLoading(false);
          return;
        }

        setRatingResult(res.data);

        const breakdown: NonNullable<typeof s.indicationData>["rateBreakdown"] = [];
        let totalPayroll = 0;
        let totalEmployees = 0;

        res.data.locations.forEach((loc, locIdx) => {
          loc.classCodes.forEach((cc) => {
            totalPayroll += cc.annualPayroll;
            const origLoc = s.locations[locIdx];
            if (origLoc) {
              const origCc = origLoc.classCodes.find((c) => c.classCode === cc.classCode);
              if (origCc) {
                totalEmployees += (origCc.fullTimeEmployees || 0) + (origCc.partTimeEmployees || 0);
              }
            }
            breakdown.push({
              location: locIdx + 1,
              state: loc.state,
              classCode: cc.classCode,
              description: cc.description || "",
              payroll: cc.annualPayroll,
              ratePer100: cc.baseRate,
              estPremium: cc.premium,
            });
          });
        });

        const finalPremium = res.data.finalPremium;
        const low = Math.round(finalPremium * 0.9);
        const high = Math.round(finalPremium * 1.1);

        s.update({
          indicationData: {
            premiumLow: Math.max(500, low),
            premiumHigh: Math.max(Math.max(500, low), high),
            rateBreakdown: breakdown,
            totalPayroll,
            totalEmployees,
            modifier,
            calculatedAt: res.data.calculatedAt,
          },
        });
      } catch (err: any) {
        setRatingError(err?.message || "Could not connect to rating engine.");
      } finally {
        setLoading(false);
      }
    }

    fetchRates();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80, gap: 16 }}>
        <Loader2 style={{ width: 32, height: 32, color: "#E91E8C", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 14, color: textSecondary }}>Calculating rates from the rating table...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (ratingError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80, gap: 16 }}>
        <AlertTriangle style={{ width: 32, height: 32, color: "#FFB547" }} />
        <p style={{ fontSize: 14, color: textPrimary, fontWeight: 600 }}>Rating Error</p>
        <p style={{ fontSize: 13, color: textSecondary, textAlign: "center", maxWidth: 400 }}>{ratingError}</p>
      </div>
    );
  }

  if (!s.indicationData) return null;

  const { premiumLow, premiumHigh, rateBreakdown, totalPayroll, totalEmployees } = s.indicationData;
  const stateCount = new Set(s.locations.map((l) => l.state).filter(Boolean)).size || 1;
  const classCodeCount = rateBreakdown.length;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const hasRateErrors = ratingResult?.locations.some((loc) => loc.classCodes.some((cc) => cc.error));

  const handleRequestProposal = () => {
    s.setPhase(2);
    s.setStep(0);
  };

  const PEO_BASE_RATE = 0.02;
  const peoAnnual = Math.round(totalPayroll * PEO_BASE_RATE);
  const peoEmployees = Math.max(totalEmployees, 1);
  const peoFrequencies = [
    { key: "Monthly", label: "Monthly", cycles: 12, unit: "PEPM" },
    { key: "BiWeekly", label: "Bi-Weekly", cycles: 26, unit: "PEPC" },
    { key: "Weekly", label: "Weekly", cycles: 52, unit: "PEPC" },
  ] as const;
  const selectedFreq = s.payrollFrequency;

  const highlights = [
    "Statutory workers' compensation coverage",
    "Employer's liability included",
    "Pay-as-you-go billing available",
    "Cannabis-specialized carrier",
    "Multi-state coverage available",
    "Dedicated claims management",
    "Return-to-work program support",
    "Certificate of insurance management",
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32, alignItems: "start" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Cannabis style={{ width: 22, height: 22, color: "#E91E8C" }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0 }}>
            Cannabis — Workers' Compensation
          </h2>
        </div>
        <p style={{ fontSize: 13, color: textMuted, margin: "2px 0 4px" }}>
          Pricing Indication — Not a Bound Quote
        </p>
        <p style={{ fontSize: 14, color: textSecondary, margin: "0 0 4px" }}>{s.businessName}</p>
        <p style={{ fontSize: 13, color: textMuted, margin: "0 0 24px" }}>{today}</p>

        <div
          style={{
            padding: 24,
            borderRadius: 12,
            background: isDark ? "#13131f" : "#f8f8fc",
            borderLeft: "3px solid #E91E8C",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 12, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Estimated Annual Premium
          </span>
          <div style={{ fontSize: 36, fontWeight: 700, color: textPrimary, margin: "8px 0" }}>
            ${premiumLow.toLocaleString()} – ${premiumHigh.toLocaleString()}
          </div>
          <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
            Based on ${totalPayroll.toLocaleString()} total payroll across {classCodeCount} class code{classCodeCount !== 1 ? "s" : ""} in {stateCount} state{stateCount !== 1 ? "s" : ""}
          </p>
          {ratingResult?.minimumPremiumApplied && (
            <p style={{ fontSize: 12, color: "#FFB547", margin: "8px 0 0" }}>
              Minimum premium of $500 applied
            </p>
          )}
          {ratingResult?.isPEO && ratingResult.peoDiscountAmount > 0 && (
            <p style={{ fontSize: 12, color: "#00D68F", margin: "4px 0 0" }}>
              PEO discount applied: -${ratingResult.peoDiscountAmount.toLocaleString()}
            </p>
          )}
        </div>

        {hasRateErrors && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "rgba(255,181,71,0.08)",
              border: "1px solid rgba(255,181,71,0.2)",
              marginBottom: 16,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertTriangle style={{ width: 16, height: 16, color: "#FFB547", flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: "#FFB547", lineHeight: 1.5 }}>
              Some class codes could not be found in the rating table. Those entries show a $0 rate and premium.
            </div>
          </div>
        )}

        <div style={{ borderRadius: 12, background: isDark ? "#13131f" : "#f8f8fc", overflow: "hidden", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                {["Location", "Class Code", "Description", "Payroll", "Rate/$100", "Est. Premium"].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: textMuted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateBreakdown.map((row, i) => {
                const hasError = ratingResult?.locations[row.location - 1]?.classCodes.find(
                  (cc) => cc.classCode === row.classCode
                )?.error;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                    <td style={{ padding: "10px 14px", color: textSecondary }}>Loc {row.location} ({row.state})</td>
                    <td style={{ padding: "10px 14px", color: hasError ? "#FFB547" : textSecondary }}>{row.classCode}</td>
                    <td style={{ padding: "10px 14px", color: textSecondary }}>{row.description}</td>
                    <td style={{ padding: "10px 14px", color: textSecondary }}>${row.payroll.toLocaleString()}</td>
                    <td style={{ padding: "10px 14px", color: hasError ? "#FFB547" : textSecondary }}>
                      ${row.ratePer100.toFixed(2)}
                      {hasError && <span title={hasError} style={{ marginLeft: 4, cursor: "help" }}>⚠</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: textPrimary, fontWeight: 600 }}>${Math.round(row.estPremium).toLocaleString()}</td>
                  </tr>
                );
              })}
              {ratingResult?.locations.filter((loc) => loc.caTerritory != null && loc.caTerritoryMultiplier !== 1.0).map((loc, i) => (
                <tr key={`territory-${i}`} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                  <td colSpan={4} style={{ padding: "10px 14px", color: textSecondary, fontSize: 12 }}>
                    CA Territory {loc.caTerritory} Adjustment ({loc.state})
                  </td>
                  <td style={{ padding: "10px 14px", color: textSecondary, fontSize: 12 }}>
                    x{loc.caTerritoryMultiplier?.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 14px", color: textPrimary, fontWeight: 600, fontSize: 12 }}>
                    {loc.caTerritoryMultiplier! > 1 ? "+" : ""}{loc.subtotalBeforeTerritory != null
                      ? `$${Math.round(loc.subtotal - loc.subtotalBeforeTerritory).toLocaleString()}`
                      : ""}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid rgba(233,30,140,0.3)` }}>
                <td colSpan={5} style={{ padding: "12px 14px", color: "#E91E8C", fontWeight: 700 }}>Total</td>
                <td style={{ padding: "12px 14px", color: "#E91E8C", fontWeight: 700 }}>
                  ${ratingResult ? Math.round(ratingResult.totalGrossPremium).toLocaleString() : Math.round(rateBreakdown.reduce((sum, r) => sum + r.estPremium, 0)).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 13, color: textMuted, margin: "0 0 8px" }}>
          Experience Modifier Applied: <strong style={{ color: textPrimary }}>{modifier.toFixed(2)}</strong>
        </p>
        <p style={{ fontSize: 13, color: "#E91E8C", fontWeight: 600, margin: "0 0 24px" }}>
          Final Indicated Range: ${premiumLow.toLocaleString()} – ${premiumHigh.toLocaleString()}
        </p>

        <div
          style={{
            padding: 20,
            borderRadius: 12,
            background: isDark ? "#13131f" : "#f8f8fc",
            borderLeft: "3px solid #7C3AED",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--app-font-heading)" }}>
              PEO Service Pricing
            </span>
            <span style={{ fontSize: 11, color: textMuted }}>
              {(PEO_BASE_RATE * 100).toFixed(0)}% of annual payroll
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: textPrimary, margin: "6px 0 4px" }}>
            ${peoAnnual.toLocaleString()}
            <span style={{ fontSize: 13, color: textMuted, fontWeight: 500, marginLeft: 8 }}>annual base</span>
          </div>
          <p style={{ fontSize: 12, color: textMuted, margin: "0 0 14px" }}>
            Based on ${totalPayroll.toLocaleString()} payroll across {peoEmployees} employee{peoEmployees !== 1 ? "s" : ""}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {peoFrequencies.map((f) => {
              const perCycle = peoAnnual / peoEmployees / f.cycles;
              const isSelected = selectedFreq === f.key;
              return (
                <div
                  key={f.key}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: isSelected ? "rgba(124,58,237,0.12)" : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                    border: isSelected ? "1px solid rgba(124,58,237,0.4)" : `1px solid ${borderColor}`,
                  }}
                >
                  <div style={{ fontSize: 10, color: isSelected ? "#A78BFA" : textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)", marginBottom: 4 }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>
                    ${perCycle.toFixed(0)}
                  </div>
                  <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
                    {f.unit} • {f.cycles}/yr
                  </div>
                </div>
              );
            })}
          </div>
          {!selectedFreq && (
            <p style={{ fontSize: 11, color: "#FFB547", margin: "10px 0 0", fontStyle: "italic" }}>
              Select a payroll frequency on the Operations step to highlight your billing cadence.
            </p>
          )}
        </div>

        <p style={{ fontSize: 12, color: textMuted, fontStyle: "italic", lineHeight: 1.6 }}>
          This indication is based on the information provided and is not a guarantee of final pricing.
          Actual premium is subject to full underwriting review, carrier approval, and final audit.
          Rates shown are based on current filed carrier rates.
        </p>
      </div>

      <div>
        <div style={{ padding: 24, borderRadius: 12, background: isDark ? "#13131f" : "#f8f8fc", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: "0 0 16px" }}>What's Included</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {highlights.map((h) => (
              <div key={h} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Check style={{ width: 16, height: 16, color: "#E91E8C", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: textSecondary }}>{h}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 12, background: isDark ? "#13131f" : "#f8f8fc", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield style={{ width: 18, height: 18, color: "#E91E8C" }} />
            <div>
              <p style={{ fontSize: 14, color: textPrimary, margin: 0, fontWeight: 600 }}>Benchmark Insurance</p>
              <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Admitted carrier — Cannabis specialist</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 24 }}>
          <Clock style={{ width: 16, height: 16, color: textMuted }} />
          <span style={{ fontSize: 13, color: textMuted }}>Est. 2-3 business days for approved proposal</span>
        </div>

        <button
          type="button"
          onClick={handleRequestProposal}
          style={{
            width: "100%",
            padding: "18px 24px",
            borderRadius: 28,
            border: "none",
            background: "#E91E8C",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            height: 56,
            marginBottom: 12,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Request Proposal
        </button>

        <button
          type="button"
          style={{
            width: "100%",
            padding: "14px 24px",
            borderRadius: 28,
            border: "1px solid #E91E8C",
            background: "transparent",
            color: "#E91E8C",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(233,30,140,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Save Indication
        </button>

        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => navigate("/marketplace")}
            style={{
              background: "none",
              border: "none",
              color: textMuted,
              fontSize: 13,
              cursor: "pointer",
              padding: "8px 0",
            }}
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}
