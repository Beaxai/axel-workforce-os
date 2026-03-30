import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { CheckCircle } from "lucide-react";

export default function FinalSubmission() {
  const s = useQuoteFlowStore();
  const hasExtraction = s.cannabisOperations.includes("Extraction");
  const hasDelivery = s.cannabisOperations.includes("Delivery");

  const totalSteps = 6 + (hasExtraction ? 1 : 0) + (hasDelivery ? 1 : 0);

  const handleSubmit = () => {
    s.setStep(s.currentStep + 1);
  };

  const stateList = [...new Set(s.locations.map((l) => l.state).filter(Boolean))].join(", ") || s.businessState;
  const totalPayroll = s.indicationData?.totalPayroll || s.getTotalPayroll();
  const totalEmployees = s.indicationData?.totalEmployees || s.getTotalEmployees();
  const premLow = s.indicationData?.premiumLow || 0;
  const premHigh = s.indicationData?.premiumHigh || 0;
  const modifier = s.indicationData?.modifier || 1.0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: 40, background: "rgba(233,30,140,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <CheckCircle style={{ width: 40, height: 40, color: "#E91E8C" }} />
      </div>

      <h2 style={{ fontSize: 32, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Ready to Submit</h2>
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
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 14, color: "#888" }}>{label}</span>
            <span style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        style={{
          padding: "18px 64px",
          borderRadius: 32,
          border: "none",
          background: "#E91E8C",
          color: "#fff",
          fontSize: 18,
          fontWeight: 700,
          cursor: "pointer",
          height: 64,
          minWidth: 320,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Submit for Approval
      </button>
    </div>
  );
}
