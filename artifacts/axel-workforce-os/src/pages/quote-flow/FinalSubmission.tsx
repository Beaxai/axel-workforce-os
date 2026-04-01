import { useThemeColors } from "@/lib/use-theme-colors";
import { useState } from "react";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { api } from "@/lib/api";
import { CheckCircle, Loader2 } from "lucide-react";

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

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

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
        lossHistoryCount: s.lossHistoryFiles.length,
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
        background: "#13131f",
        borderRadius: 12,
        padding: 24,
        maxWidth: 480,
        width: "100%",
        textAlign: "left",
        marginBottom: 32,
      }}>
        {[
          ["Business Name", s.businessName],
          ["Coverage Type", "Workers' Compensation"],
          ["Vertical", s.vertical || "Cannabis"],
          ["Total Annual Payroll", `$${totalPayroll.toLocaleString()}`],
          ["Total Employees", String(totalEmployees)],
          ["States", stateList],
          ["Experience Modifier", modifier.toFixed(2)],
          ["Indication Range", `$${premLow.toLocaleString()} – $${premHigh.toLocaleString()}`],
          ["Loss History Docs", s.lossHistoryFiles.length > 0 ? `${s.lossHistoryFiles.length} uploaded` : "None"],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 14, color: "#888" }}>{label}</span>
            <span style={{ fontSize: 14, color: textPrimary, fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 16 }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          padding: "18px 64px",
          borderRadius: 32,
          border: "none",
          background: "#E91E8C",
          color: textPrimary,
          fontSize: 18,
          fontWeight: 700,
          cursor: submitting ? "wait" : "pointer",
          height: 64,
          minWidth: 320,
          transition: "opacity 0.15s",
          opacity: submitting ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
        onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.opacity = "0.9"; }}
        onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.opacity = "1"; }}
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
