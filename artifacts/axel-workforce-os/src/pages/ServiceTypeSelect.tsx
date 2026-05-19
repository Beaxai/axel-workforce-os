import { useLocation, useNavigate } from "react-router-dom";
import { Check, ArrowLeft } from "lucide-react";
import { useThemeColors } from "@/lib/use-theme-colors";

const ACCENT = "#E91E8C";
const BASE = import.meta.env.BASE_URL;

const WC_FEATURES = [
  "Competitive premium rates",
  "Pay-as-you-go billing available",
  "Dedicated claims management",
];

const PEO_FEATURES = [
  "Workers\u2019 comp bundled with payroll and HR administration",
  "Access to Fortune 500-level employee benefits",
  "Dedicated HR compliance support and handbook creation",
  "Streamlined onboarding and offboarding processes",
  "Risk management and safety program implementation",
  "Single point of contact for all workforce needs",
];

const ASO_FEATURES = [
  "Superior HR management platform",
  "Full-service payroll & tax filing",
  "HR administration & compliance",
  "Benefits administration",
  "Time & attendance",
  "Employee handbook & policies",
  "You keep your own WC policy",
];

const totalSteps = 19;

export default function ServiceTypeSelect() {
  const location = useLocation();
  const navigate = useNavigate();
  const { vertical } = (location.state as { vertical?: string }) || {};
  const {
    isDark,
    textPrimary,
    textSecondary,
    textMuted,
    cardBg,
    borderColor,
  } = useThemeColors();

  if (!vertical) {
    navigate("/marketplace", { replace: true });
    return null;
  }

  const startWizard = (coverageType: "WC" | "PEO" | "ASO") => {
    navigate("/marketplace/quote/wizard", {
      state: { vertical, coverageType },
    });
  };

  const startAsoQuote = () => {
    startWizard("ASO");
  };

  const handleBack = () => navigate("/marketplace");

  const btnBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const btnHoverBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

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
            background: ACCENT,
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
          marginBottom: 32,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: ACCENT,
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

      <div style={{ width: "100%", flex: 1 }}>
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
            marginTop: 12,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Choose the program that best fits their needs.
        </p>

        <div
          className="vertical-detail-cards"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 25,
          }}
        >
          <CoverageCard
            title="WorkShield"
            subtitle="Traditional Workers' Compensation policy"
            icon={
              <div
                style={{
                  position: "relative",
                  width: 70,
                  height: 70,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={`${BASE}images/brand/axel-shield.svg`}
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
                <img
                  src={`${BASE}images/brand/axel-a-mark.png`}
                  alt="WorkShield"
                  style={{
                    position: "relative",
                    width: 32,
                    height: 32,
                    objectFit: "contain",
                    marginTop: 2,
                  }}
                />
              </div>
            }
            features={WC_FEATURES}
            onStart={() => startWizard("WC")}
            ctaLabel="Start Submission"
            isDark={isDark}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textMuted={textMuted}
            cardBg={cardBg}
            borderColor={borderColor}
          />
          <CoverageCard
            title="WorkPlus OS (ASO)"
            subtitle="Elite Workforce Management Program"
            eyebrow="Program"
            icon={
              <div
                style={{
                  position: "relative",
                  width: 70,
                  height: 70,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={`${BASE}images/brand/axel-aso-icon.svg`}
                  alt="WorkPlus OS"
                  style={{
                    width: 85,
                    height: 85,
                    objectFit: "contain",
                    marginTop: 10,
                  }}
                />
              </div>
            }
            features={ASO_FEATURES}
            onStart={startAsoQuote}
            ctaLabel="Get ASO Quote"
            isDark={isDark}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textMuted={textMuted}
            cardBg={cardBg}
            borderColor={borderColor}
          />
          <CoverageCard
            title="Workforce Solution (PEO)"
            subtitle="Premier Workforce Solution Program"
            eyebrow="Program"
            icon={
              <div
                style={{
                  position: "relative",
                  width: 70,
                  height: 70,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={`${BASE}images/brand/axel-peo-icon.png`}
                  alt="Workforce Solution"
                  style={{
                    width: 85,
                    height: 85,
                    objectFit: "contain",
                    marginTop: 10,
                  }}
                />
              </div>
            }
            features={PEO_FEATURES}
            onStart={() => startWizard("PEO")}
            ctaLabel="Start Submission"
            isDark={isDark}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            textMuted={textMuted}
            cardBg={cardBg}
            borderColor={borderColor}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
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
      </div>
    </div>
  );
}

function CoverageCard({
  title,
  icon,
  features,
  onStart,
  ctaLabel,
  badge,
  subtitle,
  eyebrow,
  isDark,
  textPrimary,
  textSecondary,
  textMuted,
  cardBg,
  borderColor,
}: {
  title: string;
  icon: React.ReactNode;
  features: string[];
  onStart: () => void;
  ctaLabel?: string;
  badge?: string;
  subtitle?: string;
  eyebrow?: string;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  borderColor: string;
}) {
  const iconBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 15,
        border: `1px solid ${borderColor}`,
        padding: 35,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 12,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          <p
            style={{
              fontFamily: "var(--app-font-heading)",
              fontSize: 12,
              fontWeight: 200,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: ACCENT,
              margin: 0,
            }}
          >
            {eyebrow || "Coverage"}
          </p>
          <h3
            style={{
              fontFamily: "var(--app-font-heading)",
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
              whiteSpace: "pre-line",
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              style={{
                fontSize: 15,
                color: textMuted,
                margin: 0,
                marginTop: 3,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <span
            style={{
              alignSelf: "flex-start",
              fontFamily: "var(--app-font-heading)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "5px 12px",
              borderRadius: 999,
              background: ACCENT,
              color: "#fff",
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 35,
          flex: 1,
        }}
      >
        {features.map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Check
              style={{
                width: 20,
                height: 20,
                color: ACCENT,
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <span
              style={{
                fontSize: 16,
                color: textSecondary,
                lineHeight: 1.55,
              }}
            >
              {f}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        style={{
          width: "100%",
          padding: "18px 30px",
          borderRadius: 12,
          border: "none",
          background: ACCENT,
          color: "#fff",
          fontFamily: "var(--app-font-heading)",
          fontSize: 16,
          fontWeight: 400,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "background 0.15s, transform 0.15s",
          height: 65,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#c91879";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = ACCENT;
        }}
      >
        {ctaLabel || "Start Submission"}
      </button>
      <p
        style={{
          fontSize: 14,
          color: textMuted,
          margin: 0,
          marginTop: 12,
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        Takes about 3 minutes
      </p>
    </div>
  );
}
