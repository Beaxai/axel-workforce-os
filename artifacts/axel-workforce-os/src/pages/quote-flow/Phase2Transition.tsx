import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { ArrowRight, FileText } from "lucide-react";

export default function Phase2Transition() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
      <div style={{ width: 72, height: 72, borderRadius: 36, background: "rgba(233,30,140,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <FileText style={{ width: 32, height: 32, color: "#E91E8C" }} />
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: "0 0 12px" }}>
        Great — let's build your full submission.
      </h2>
      <p style={{ fontSize: 16, color: "#888", lineHeight: 1.6, margin: "0 0 32px" }}>
        We'll need a few more details to prepare your approved proposal and send it to underwriting.
      </p>
      <button
        type="button"
        onClick={() => s.setStep(1)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "16px 40px", borderRadius: 28, border: "none",
          background: "#E91E8C", color: textPrimary, fontSize: 16, fontWeight: 700,
          cursor: "pointer", transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Let's Go
        <ArrowRight style={{ width: 18, height: 18 }} />
      </button>
    </div>
  );
}
