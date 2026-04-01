import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Shield, Users, Check, ChevronRight, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { useThemeColors } from "@/lib/use-theme-colors";

const WC_FEATURES = [
  "Competitive premium rates",
  "Pay-as-you-go options available",
  "Claims management support",
  "Experience mod analysis",
  "Multiple carrier options",
  "Fast turnaround on quotes",
];

const PEO_FEATURES = [
  "Workers\u2019 comp included",
  "Payroll processing & tax filing",
  "Health, dental & vision benefits",
  "HR compliance & support",
  "Risk management services",
  "Single point of contact",
];

type CoverageType = "WC" | "PEO";

export default function ServiceTypeSelect() {
  const location = useLocation();
  const navigate = useNavigate();
  const { vertical } = (location.state as { vertical?: string }) || {};
  const { isDark, textPrimary, textMuted, borderColor, hoverBg } = useThemeColors();

  const [selected, setSelected] = useState<Set<CoverageType>>(new Set(["WC", "PEO"]));

  if (!vertical) {
    navigate("/marketplace", { replace: true });
    return null;
  }

  const totalSteps = selected.has("WC") && selected.has("PEO") ? 19 : selected.has("PEO") ? 6 : 5;

  const toggleCard = (type: CoverageType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleContinue = () => {
    if (selected.size === 0) return;
    const quoteType = selected.has("WC") && selected.has("PEO") ? "PEO+WC" : selected.has("PEO") ? "PEO" : "WC";
    navigate("/marketplace/quote/wizard", {
      state: { vertical, coverageType: quoteType },
    });
  };

  const handleBack = () => {
    navigate("/marketplace");
  };

  const btnBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const btnHoverBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const cardBgColor = isDark ? "#13131f" : "#f8f8fa";
  const cardBorderDefault = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const checkBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const featureBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const iconBg = isDark ? "#2d1f3d" : "rgba(124,58,237,0.12)";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 56px)" }}>
      <div
        style={{
          height: 3,
          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          width: "100%",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(2 / totalSteps) * 100}%`,
            background: "#E91E8C",
            transition: "width 0.3s",
            borderRadius: 2,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 0 0 0",
          marginBottom: 40,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#E91E8C",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Service Type
        </span>
        <span style={{ fontSize: 13, color: textMuted }}>
          Step 2 of {totalSteps}
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", width: "100%", flex: 1 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          What type of coverage is the prospect looking for?
        </h1>
        <p
          style={{
            fontSize: 16,
            color: textMuted,
            margin: 0,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          Select one or both options to get pricing
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginTop: 40,
          }}
        >
          <SelectionCard
            icon={<Shield style={{ width: 28, height: 28, color: isDark ? "#fff" : "#7C3AED" }} />}
            title="Standalone Workers' Compensation"
            subtitle="Traditional WC policy with competitive rates"
            features={WC_FEATURES}
            turnaround="Instant Price Indication!"
            isSelected={selected.has("WC")}
            onToggle={() => toggleCard("WC")}
            textPrimary={textPrimary}
            textMuted={textMuted}
            cardBg={cardBgColor}
            cardBorderDefault={cardBorderDefault}
            checkBorder={checkBorder}
            featureBorder={featureBorder}
            iconBg={iconBg}
          />
          <SelectionCard
            icon={<Users style={{ width: 28, height: 28, color: isDark ? "#fff" : "#7C3AED" }} />}
            title="Comprehensive Workforce Solution (PEO)"
            subtitle="Full-service HR, payroll, benefits & WC bundled"
            features={PEO_FEATURES}
            turnaround="Est. 3-5 business days for indication"
            isSelected={selected.has("PEO")}
            onToggle={() => toggleCard("PEO")}
            textPrimary={textPrimary}
            textMuted={textMuted}
            cardBg={cardBgColor}
            cardBorderDefault={cardBorderDefault}
            checkBorder={checkBorder}
            featureBorder={featureBorder}
            iconBg={iconBg}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 0",
          marginTop: 40,
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            borderRadius: 24,
            border: "none",
            background: btnBg,
            color: textPrimary,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            height: 44,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = btnHoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = btnBg)}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={selected.size === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            borderRadius: 24,
            border: "none",
            background: selected.size > 0 ? btnBg : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
            color: selected.size > 0 ? textPrimary : textMuted,
            fontSize: 14,
            fontWeight: 600,
            cursor: selected.size > 0 ? "pointer" : "not-allowed",
            height: 44,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (selected.size > 0) e.currentTarget.style.background = btnHoverBg;
          }}
          onMouseLeave={(e) => {
            if (selected.size > 0) e.currentTarget.style.background = btnBg;
          }}
        >
          Continue
          <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

function SelectionCard({
  icon,
  title,
  subtitle,
  features,
  turnaround,
  isSelected,
  onToggle,
  textPrimary,
  textMuted,
  cardBg,
  cardBorderDefault,
  checkBorder,
  featureBorder,
  iconBg,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  features: string[];
  turnaround: string;
  isSelected: boolean;
  onToggle: () => void;
  textPrimary: string;
  textMuted: string;
  cardBg: string;
  cardBorderDefault: string;
  checkBorder: string;
  featureBorder: string;
  iconBg: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        background: cardBg,
        borderRadius: 16,
        border: isSelected ? "2px solid #E91E8C" : `2px solid ${cardBorderDefault}`,
        padding: 32,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          width: "100%",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: isSelected ? "#E91E8C" : "transparent",
            border: isSelected ? "none" : `2px solid ${checkBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s, border 0.15s",
            flexShrink: 0,
          }}
        >
          {isSelected && <Check style={{ width: 18, height: 18, color: "#fff" }} />}
        </div>
      </div>
      <h3
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: textPrimary,
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 14,
          color: textMuted,
          margin: 0,
          marginTop: 8,
        }}
      >
        {subtitle}
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 32,
          flex: 1,
        }}
      >
        {features.map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <ChevronRight
              style={{
                width: 16,
                height: 16,
                color: "#E91E8C",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 15, color: textPrimary, lineHeight: 1.4 }}>
              {f}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 28,
          paddingTop: 20,
          borderTop: `1px solid ${featureBorder}`,
        }}
      >
        <Clock style={{ width: 14, height: 14, color: "#E91E8C", flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "#E91E8C" }}>{turnaround}</span>
      </div>
    </button>
  );
}
