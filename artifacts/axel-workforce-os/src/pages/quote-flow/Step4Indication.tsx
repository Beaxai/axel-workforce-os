import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { Check, Clock, Shield, Cannabis } from "lucide-react";

const BASE_RATES: Record<string, number> = {
  "0005": 3.12,
  "0008": 2.87,
  "0016": 3.45,
  "0037": 5.82,
  "2585": 2.34,
  "4511": 6.15,
  "4720": 4.67,
  "4829": 7.23,
  "8017": 1.85,
  "8742": 1.12,
  "8810": 0.32,
  "9015": 4.12,
};

export default function Step4Indication() {
  const s = useQuoteFlowStore();
  const navigate = useNavigate();
  const [calculated, setCalculated] = useState(false);

  const modifier = s.hasExperienceMod === "Yes" ? parseFloat(s.experienceMod) || 1.0 : 1.0;

  useEffect(() => {
    const breakdown: typeof s.indicationData extends null ? never : NonNullable<typeof s.indicationData>["rateBreakdown"] = [];
    let totalPremium = 0;
    let totalPayroll = 0;
    let totalEmployees = 0;

    s.locations.forEach((loc, locIdx) => {
      loc.classCodes.forEach((cc) => {
        const rate = BASE_RATES[cc.classCode] || 3.5;
        const premium = (cc.annualPayroll / 100) * rate;
        totalPremium += premium;
        totalPayroll += cc.annualPayroll;
        totalEmployees += cc.fullTimeEmployees + cc.partTimeEmployees;
        breakdown.push({
          location: locIdx + 1,
          state: loc.state,
          classCode: cc.classCode,
          description: cc.description,
          payroll: cc.annualPayroll,
          ratePer100: rate,
          estPremium: premium,
        });
      });
    });

    const modifiedPremium = totalPremium * modifier;
    const rawLow = Math.round(modifiedPremium * 0.9);
    const rawHigh = Math.round(modifiedPremium * 1.1);
    const low = Math.max(500, rawLow);
    const high = Math.max(low, rawHigh);

    s.update({
      indicationData: {
        premiumLow: low,
        premiumHigh: high,
        rateBreakdown: breakdown,
        totalPayroll,
        totalEmployees,
        modifier,
        calculatedAt: new Date().toISOString(),
      },
    });
    setCalculated(true);
  }, []);

  if (!calculated || !s.indicationData) return null;

  const { premiumLow, premiumHigh, rateBreakdown, totalPayroll, totalEmployees } = s.indicationData;
  const stateCount = new Set(s.locations.map((l) => l.state).filter(Boolean)).size || 1;
  const classCodeCount = rateBreakdown.length;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const handleRequestProposal = () => {
    s.setPhase(2);
    s.setStep(0);
  };

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
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>
            Cannabis — Workers' Compensation
          </h2>
        </div>
        <p style={{ fontSize: 13, color: "#888", margin: "2px 0 4px" }}>
          Pricing Indication — Not a Bound Quote
        </p>
        <p style={{ fontSize: 14, color: "#ccc", margin: "0 0 4px" }}>{s.businessName}</p>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px" }}>{today}</p>

        <div
          style={{
            padding: 24,
            borderRadius: 12,
            background: "#13131f",
            borderLeft: "3px solid #E91E8C",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Estimated Annual Premium
          </span>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", margin: "8px 0" }}>
            ${premiumLow.toLocaleString()} – ${premiumHigh.toLocaleString()}
          </div>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            Based on ${totalPayroll.toLocaleString()} total payroll across {classCodeCount} class code{classCodeCount !== 1 ? "s" : ""} in {stateCount} state{stateCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ borderRadius: 12, background: "#13131f", overflow: "hidden", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Location", "Class Code", "Description", "Payroll", "Rate/$100", "Est. Premium"].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: "#888", fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateBreakdown.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 14px", color: "#ccc" }}>Loc {row.location} ({row.state})</td>
                  <td style={{ padding: "10px 14px", color: "#ccc" }}>{row.classCode}</td>
                  <td style={{ padding: "10px 14px", color: "#ccc" }}>{row.description}</td>
                  <td style={{ padding: "10px 14px", color: "#ccc" }}>${row.payroll.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", color: "#ccc" }}>${row.ratePer100.toFixed(2)}</td>
                  <td style={{ padding: "10px 14px", color: "#fff", fontWeight: 600 }}>${Math.round(row.estPremium).toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid rgba(233,30,140,0.3)" }}>
                <td colSpan={5} style={{ padding: "12px 14px", color: "#E91E8C", fontWeight: 700 }}>Total</td>
                <td style={{ padding: "12px 14px", color: "#E91E8C", fontWeight: 700 }}>
                  ${Math.round(rateBreakdown.reduce((s, r) => s + r.estPremium, 0)).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 13, color: "#888", margin: "0 0 8px" }}>
          Experience Modifier Applied: <strong style={{ color: "#fff" }}>{modifier.toFixed(2)}</strong>
        </p>
        <p style={{ fontSize: 13, color: "#E91E8C", fontWeight: 600, margin: "0 0 24px" }}>
          Final Indicated Range: ${premiumLow.toLocaleString()} – ${premiumHigh.toLocaleString()}
        </p>

        <p style={{ fontSize: 12, color: "#666", fontStyle: "italic", lineHeight: 1.6 }}>
          This indication is based on the information provided and is not a guarantee of final pricing.
          Actual premium is subject to full underwriting review, carrier approval, and final audit.
          Rates shown are based on current filed carrier rates.
        </p>
      </div>

      <div>
        <div style={{ padding: 24, borderRadius: 12, background: "#13131f", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>What's Included</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {highlights.map((h) => (
              <div key={h} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Check style={{ width: 16, height: 16, color: "#E91E8C", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#ccc" }}>{h}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 12, background: "#13131f", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield style={{ width: 18, height: 18, color: "#E91E8C" }} />
            <div>
              <p style={{ fontSize: 14, color: "#fff", margin: 0, fontWeight: 600 }}>Benchmark Insurance</p>
              <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Admitted carrier — Cannabis specialist</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 24 }}>
          <Clock style={{ width: 16, height: 16, color: "#888" }} />
          <span style={{ fontSize: 13, color: "#888" }}>Est. 2-3 business days for approved proposal</span>
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
          Request Proposal →
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
              color: "#888",
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
