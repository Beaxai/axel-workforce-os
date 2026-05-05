import { useThemeColors } from "@/lib/use-theme-colors";
import { useNavigate } from "react-router-dom";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { CheckCircle } from "lucide-react";

export default function ConfirmationScreen() {
  const navigate = useNavigate();
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  const dealNumber = s.submittedDealId
    ? `DL-${s.submittedDealId.slice(0, 8).toUpperCase()}`
    : `DL-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const wcRatingBreakdown = s.indicationData?.wcRatingBreakdown || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", textAlign: "center" }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          background: "rgba(233,30,140,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          animation: "pulse-pink 1.5s ease-in-out infinite",
        }}
      >
        <CheckCircle style={{ width: 44, height: 44, color: "#E91E8C" }} />
      </div>

      <h2 style={{ fontSize: 32, fontWeight: 700, color: textPrimary, margin: "0 0 8px" }}>
        Submission Received
      </h2>
      <p style={{ fontSize: 16, color: "#888", margin: "0 0 8px" }}>
        Deal #{dealNumber} has been submitted for underwriting review.
      </p>
      <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px", maxWidth: 420, lineHeight: 1.6 }}>
        You'll receive a notification when your proposal is ready.
        Estimated turnaround: 2-3 business days.
      </p>

      {wcRatingBreakdown && (
        <div style={{
          background: isDark ? "#13131f" : "#f8f8fc",
          borderRadius: 12,
          padding: 16,
          maxWidth: 420,
          width: "100%",
          textAlign: "left",
          marginBottom: 24,
          border: `1px solid ${borderColor}`,
        }}>
          <div style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Quote Snapshot
          </div>
          {wcRatingBreakdown.locations.map((loc, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
              <span style={{ color: textSecondary }}>Loc {i + 1} — {loc.state}</span>
              <span style={{ color: textPrimary, fontWeight: 500 }}>${Math.round(loc.subtotal).toLocaleString()}</span>
            </div>
          ))}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0 2px",
            marginTop: 6,
            borderTop: "1px solid rgba(233,30,140,0.3)",
            fontSize: 14,
            fontWeight: 700,
          }}>
            <span style={{ color: "#E91E8C" }}>Final Premium</span>
            <span style={{ color: "#E91E8C" }}>${Math.round(wcRatingBreakdown.finalPremium).toLocaleString()}</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={() => { s.reset(); navigate("/pipeline"); }}
          style={{
            padding: "14px 28px",
            borderRadius: 28,
            border: "none",
            background: "#E91E8C",
            color: textPrimary,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          View Deal in Pipeline
        </button>
        <button
          type="button"
          onClick={() => { s.reset(); navigate("/marketplace"); }}
          style={{
            padding: "14px 28px",
            borderRadius: 28,
            border: "1px solid #E91E8C",
            background: "transparent",
            color: "#E91E8C",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(233,30,140,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Back to Marketplace
        </button>
      </div>

      <style>{`
        @keyframes pulse-pink {
          0%, 100% { box-shadow: 0 0 0 0 rgba(233,30,140,0.3); }
          50% { box-shadow: 0 0 0 16px rgba(233,30,140,0); }
        }
      `}</style>
    </div>
  );
}
