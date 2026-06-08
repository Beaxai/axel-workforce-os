import { useThemeColors } from "@/lib/use-theme-colors";
import { useState } from "react";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { api } from "@/lib/api";
import { CheckCircle, Loader2 } from "lucide-react";
import { fromQuoteFlow } from "@workspace/cannabis-application";

export default function FinalSubmission() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const stateList = [...new Set(s.locations.map((l) => l.state).filter(Boolean))].join(", ") || s.businessState;
  const totalPayroll = s.indicationData?.totalPayroll || s.getTotalPayroll();
  const totalEmployees = s.indicationData?.totalEmployees || s.getTotalEmployees();
  const premLow = s.indicationData?.premiumLow || 0;
  const premHigh = s.indicationData?.premiumHigh || 0;
  const modifier = s.indicationData?.modifier || 1.0;
  const wcRatingBreakdown = s.indicationData?.wcRatingBreakdown || null;
  const workforceProfile = s.indicationData?.workforceProfile || null;
  const finalPremium = wcRatingBreakdown?.finalPremium ?? 0;

  const canSubmit = !!wcRatingBreakdown && !!workforceProfile;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError(
        "Rating data is missing. Please go back to the Indication step to recalculate before submitting.",
      );
      return;
    }
    setSubmitting(true);
    setError("");

    // Build canonical Cannabis WC application payload from the quote-flow store.
    // The server validates this with `cannabisApplicationAnswersSchema` and
    // can stream filled ACORD 130 / Trean Cannabis Supp PDFs from it.
    const cannabisApplicationAnswers = fromQuoteFlow(
      s as unknown as Parameters<typeof fromQuoteFlow>[0],
    );

    try {
      const result = await api.post<{ success: boolean; dealId: string }>("/submission/submit-for-approval", {
        businessName: s.businessName,
        vertical: s.vertical || "Cannabis",
        coverageType: s.coverageType || "Workers' Compensation",
        businessState: s.businessState,
        totalPayroll,
        totalEmployees,
        experienceMod: modifier,
        premiumLow: premLow,
        premiumHigh: premHigh,
        statesOfOperation: stateList.split(", ").filter(Boolean),
        fein: s.fein,
        entityType: s.entityType,
        contactName: s.contactName,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        coverageEffectiveDate: s.coverageEffectiveDate || null,
        lossHistoryCount: s.lossHistoryFiles.length,
        cannabisApplicationAnswers,
        wcRatingBreakdown,
        workforceProfile,
      });

      s.update({ submittedDealId: result.dealId });
      s.setStep(s.currentStep + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: 40, background: "rgba(233,30,140,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <CheckCircle style={{ width: 40, height: 40, color: "#E91E8C" }} />
      </div>

      <h2 style={{ fontSize: 32, fontWeight: 700, color: textPrimary, margin: "0 0 8px" }}>Ready to Submit</h2>
      <p style={{ fontSize: 16, color: "#888", margin: "0 0 32px", maxWidth: 460, lineHeight: 1.6 }}>
        Your complete submission has been compiled and is ready for underwriting review.
      </p>

      <div style={{
        background: isDark ? "#13131f" : "#f8f8fc",
        borderRadius: 12,
        padding: 24,
        maxWidth: 560,
        width: "100%",
        textAlign: "left",
        marginBottom: 24,
      }}>
        {[
          ["Business Name", s.businessName],
          ["Coverage Type", "Workers' Compensation"],
          ["Coverage Effective Date", s.coverageEffectiveDate || "Not specified"],
          ["Vertical", s.vertical || "Cannabis"],
          ["Total Annual Payroll", `$${totalPayroll.toLocaleString()}`],
          ["Total Employees", String(totalEmployees)],
          ["States", stateList],
          ["Experience Modifier", modifier.toFixed(2)],
          ["Indication Range", `$${premLow.toLocaleString()} – $${premHigh.toLocaleString()}`],
          ["Loss History Docs", s.lossHistoryFiles.length > 0 ? `${s.lossHistoryFiles.length} uploaded` : "None"],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
            <span style={{ fontSize: 14, color: textMuted }}>{label}</span>
            <span style={{ fontSize: 14, color: textPrimary, fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      {wcRatingBreakdown && workforceProfile ? (
        <div style={{
          background: isDark ? "#13131f" : "#f8f8fc",
          borderRadius: 12,
          padding: 20,
          maxWidth: 560,
          width: "100%",
          textAlign: "left",
          marginBottom: 24,
          borderLeft: "3px solid #E91E8C",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Per-Location Breakdown
            </span>
            <span style={{ fontSize: 12, color: textMuted }}>
              {wcRatingBreakdown.locations.length} location{wcRatingBreakdown.locations.length !== 1 ? "s" : ""}
            </span>
          </div>

          {wcRatingBreakdown.locations.map((loc, i) => {
            const profileLoc = workforceProfile.locations[i];
            const locPayroll = loc.classCodes.reduce((sum, cc) => sum + cc.annualPayroll, 0);
            const ccCount = loc.classCodes.length;
            return (
              <div key={i} style={{
                padding: "10px 0",
                borderBottom: i === wcRatingBreakdown.locations.length - 1 ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, color: textPrimary, fontWeight: 600 }}>
                    Loc {i + 1} — {loc.state}{profileLoc?.zip ? ` ${profileLoc.zip}` : ""}
                  </span>
                  <span style={{ fontSize: 14, color: textPrimary, fontWeight: 600 }}>
                    ${Math.round(loc.subtotal).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: textMuted }}>
                  <span>{ccCount} class code{ccCount !== 1 ? "s" : ""} • ${locPayroll.toLocaleString()} payroll</span>
                  {loc.caTerritoryMultiplier && loc.caTerritoryMultiplier !== 1.0 && (
                    <span>CA Territory {loc.caTerritory} ×{loc.caTerritoryMultiplier.toFixed(2)}</span>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 12,
            paddingTop: 12,
            borderTop: "2px solid rgba(233,30,140,0.3)",
          }}>
            <span style={{ fontSize: 13, color: "#E91E8C", fontWeight: 700 }}>Final Premium</span>
            <span style={{ fontSize: 18, color: "#E91E8C", fontWeight: 700 }}>
              ${Math.round(finalPremium).toLocaleString()}
            </span>
          </div>

          {wcRatingBreakdown.minimumPremiumApplied && (
            <p style={{ fontSize: 11, color: "#FFB547", margin: "8px 0 0" }}>
              Minimum premium of $500 applied
            </p>
          )}
          {wcRatingBreakdown.isPEO && wcRatingBreakdown.peoDiscountAmount > 0 && (
            <p style={{ fontSize: 11, color: "#00D68F", margin: "4px 0 0" }}>
              PEO discount applied: -${wcRatingBreakdown.peoDiscountAmount.toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderRadius: 10,
          background: "rgba(255,181,71,0.08)",
          border: "1px solid rgba(255,181,71,0.2)",
          maxWidth: 560,
          width: "100%",
          marginBottom: 24,
        }}>
          <AlertTriangle style={{ width: 16, height: 16, color: "#FFB547", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#FFB547" }}>
            No rating breakdown found. Revisit the Indication step to generate one.
          </span>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 16 }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !canSubmit}
        title={!canSubmit ? "Rating data missing — return to the Indication step." : undefined}
        style={{
          padding: "18px 64px",
          borderRadius: 32,
          border: "none",
          background: "#E91E8C",
          color: "#fff",
          fontSize: 18,
          fontWeight: 700,
          cursor: submitting ? "wait" : !canSubmit ? "not-allowed" : "pointer",
          height: 64,
          minWidth: 320,
          transition: "opacity 0.15s",
          opacity: submitting || !canSubmit ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
        onMouseEnter={(e) => { if (!submitting && canSubmit) e.currentTarget.style.opacity = "0.9"; }}
        onMouseLeave={(e) => { if (!submitting && canSubmit) e.currentTarget.style.opacity = "1"; }}
      >
        {submitting && <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />}
        {submitting ? "Submitting..." : "Submit for Approval"}
      </button>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
