import { useState } from "react";

type Determination = "Acceptable" | "Referral" | "Conditional" | "Ineligible" | "Unknown";

interface AppetiteBadgeProps {
  determination: Determination | string;
  considerations?: string | null;
  showTooltip?: boolean;
  size?: "sm" | "md";
}

const COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Acceptable:  { bg: "rgba(0,214,143,0.1)",   border: "rgba(0,214,143,0.3)",   text: "#00D68F", dot: "#00D68F" },
  Referral:    { bg: "rgba(255,181,71,0.1)",   border: "rgba(255,181,71,0.3)",   text: "#FFB547", dot: "#FFB547" },
  Conditional: { bg: "rgba(100,149,237,0.1)",  border: "rgba(100,149,237,0.3)",  text: "#6495ED", dot: "#6495ED" },
  Ineligible:  { bg: "rgba(255,85,85,0.1)",    border: "rgba(255,85,85,0.3)",    text: "#FF5555", dot: "#FF5555" },
  Unknown:     { bg: "rgba(90,96,117,0.1)",    border: "rgba(90,96,117,0.3)",    text: "#5A6075", dot: "#5A6075" },
};

export function AppetiteBadge({
  determination,
  considerations,
  showTooltip = true,
  size = "sm",
}: AppetiteBadgeProps) {
  const [tooltip, setTooltip] = useState(false);
  const key = determination in COLORS ? determination : "Unknown";
  const c = COLORS[key];
  const pad = size === "sm" ? "2px 8px" : "4px 12px";
  const fontSize = size === "sm" ? 10 : 12;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        onMouseEnter={() => showTooltip && considerations && setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: pad,
          borderRadius: 20,
          fontSize,
          fontWeight: 600,
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.text,
          cursor: considerations ? "help" : "default",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
        {determination}
        {considerations && <span style={{ fontSize: fontSize - 1, opacity: 0.7 }}>i</span>}
      </span>
      {tooltip && considerations && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: 0,
          marginBottom: 6,
          zIndex: 100,
          background: "#1A2035",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 11,
          color: "#D0D6E8",
          lineHeight: 1.6,
          maxWidth: 280,
          whiteSpace: "pre-wrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#5A6075",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            marginBottom: 4,
          }}>
            UW Conditions
          </div>
          {considerations}
        </div>
      )}
    </div>
  );
}

export default AppetiteBadge;
export type { Determination };
