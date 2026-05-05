import { useThemeColors } from "@/lib/use-theme-colors";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Shield, Users, Check, ArrowLeft } from "lucide-react";
import { getVerticalBySlug } from "@/lib/vertical-data";

const BASE = import.meta.env.BASE_URL || "/";

const ACCENT = "#E91E8C";

export default function VerticalDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor, hoverBg } =
    useThemeColors();
  const navigate = useNavigate();
  const vertical = slug ? getVerticalBySlug(slug) : undefined;

  if (!vertical) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: textMuted, fontSize: 16, marginBottom: 12 }}>
          Vertical not found.
        </p>
        <Link
          to="/marketplace"
          style={{ color: ACCENT, textDecoration: "none", fontSize: 14 }}
        >
          Back to marketplace
        </Link>
      </div>
    );
  }

  const handleStartSubmission = () => {
    navigate("/marketplace/quote/service-type", {
      state: { vertical: vertical.name },
    });
  };

  return (
    <div style={{ width: "100%" }}>
      <Link
        to="/marketplace"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: textMuted,
          textDecoration: "none",
          fontSize: 13,
          fontFamily: "var(--app-font-heading)",
          fontWeight: 300,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 20,
          padding: "6px 10px",
          marginLeft: -10,
          borderRadius: 6,
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hoverBg;
          e.currentTarget.style.color = textSecondary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = textMuted;
        }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Back to marketplace
      </Link>

      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 32,
          height: 360,
          background: "#0e0e14",
        }}
      >
        <img
          src={`${BASE}${vertical.image.replace(/^\//, "")}`}
          alt={vertical.name}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition:
              vertical.slug === "all-other-industries" ? "center 60%" : "center",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.78) 100%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "32px 36px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--app-font-heading)",
              fontSize: 12,
              fontWeight: 200,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: ACCENT,
              margin: 0,
              marginBottom: 10,
            }}
          >
            Marketplace
          </p>
          <h1
            style={{
              fontFamily: "var(--app-font-heading)",
              fontSize: 40,
              fontWeight: 300,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#fff",
              margin: 0,
              lineHeight: 1.1,
              textShadow: "0 1px 6px rgba(0,0,0,0.45)",
              maxWidth: 820,
            }}
          >
            {vertical.name}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.78)",
              margin: 0,
              marginTop: 12,
              maxWidth: 720,
              lineHeight: 1.5,
            }}
          >
            {vertical.descriptor}
          </p>
        </div>
      </div>

      <p
        style={{
          fontSize: 15,
          color: textSecondary,
          lineHeight: 1.75,
          margin: 0,
          marginBottom: 36,
          maxWidth: 880,
        }}
      >
        {vertical.description}
      </p>

      <div
        className="vertical-detail-cards"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
        }}
      >
        <CoverageCard
          title="Workers' Compensation"
          icon={<Shield style={{ width: 22, height: 22, color: ACCENT }} />}
          description={vertical.wcDescription}
          features={vertical.wcFeatures}
          onStart={handleStartSubmission}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          textMuted={textMuted}
          cardBg={cardBg}
          borderColor={borderColor}
        />
        <CoverageCard
          title="Workforce Solution (PEO)"
          icon={<Users style={{ width: 22, height: 22, color: ACCENT }} />}
          description={vertical.peoDescription}
          features={vertical.peoFeatures}
          onStart={handleStartSubmission}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          textMuted={textMuted}
          cardBg={cardBg}
          borderColor={borderColor}
        />
      </div>
    </div>
  );
}

function CoverageCard({
  title,
  icon,
  description,
  features,
  onStart,
  isDark,
  textPrimary,
  textSecondary,
  textMuted,
  cardBg,
  borderColor,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  onStart: () => void;
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
        borderRadius: 12,
        border: `1px solid ${borderColor}`,
        padding: 28,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p
            style={{
              fontFamily: "var(--app-font-heading)",
              fontSize: 10,
              fontWeight: 200,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: ACCENT,
              margin: 0,
            }}
          >
            Coverage
          </p>
          <h3
            style={{
              fontFamily: "var(--app-font-heading)",
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h3>
        </div>
      </div>

      <p
        style={{
          fontSize: 14,
          color: textSecondary,
          lineHeight: 1.65,
          margin: 0,
          marginBottom: 22,
        }}
      >
        {description}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 28,
          flex: 1,
        }}
      >
        {features.map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Check
              style={{
                width: 16,
                height: 16,
                color: ACCENT,
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <span
              style={{
                fontSize: 13,
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
          padding: "14px 24px",
          borderRadius: 10,
          border: "none",
          background: ACCENT,
          color: "#fff",
          fontFamily: "var(--app-font-heading)",
          fontSize: 13,
          fontWeight: 400,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "background 0.15s, transform 0.15s",
          height: 52,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#c91879";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = ACCENT;
        }}
      >
        Start Submission
      </button>
      <p
        style={{
          fontSize: 11,
          color: textMuted,
          margin: 0,
          marginTop: 10,
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        Takes about 3 minutes
      </p>
    </div>
  );
}
