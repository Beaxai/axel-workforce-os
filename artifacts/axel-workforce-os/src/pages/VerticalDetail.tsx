import { useThemeColors } from "@/lib/use-theme-colors";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Shield, Users, Check, ArrowLeft } from "lucide-react";
import { getVerticalBySlug } from "@/lib/vertical-data";

export default function VerticalDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();
  const navigate = useNavigate();
  const vertical = slug ? getVerticalBySlug(slug) : undefined;

  if (!vertical) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "#888", fontSize: 16 }}>Vertical not found.</p>
        <Link
          to="/marketplace"
          style={{ color: "#E91E8C", textDecoration: "none", fontSize: 14 }}
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const handleStartSubmission = () => {
    navigate("/marketplace/quote/service-type", {
      state: { vertical: vertical.name },
    });
  };

  const Icon = vertical.icon;

  return (
    <div style={{ maxWidth: 1000 }}>
      <Link
        to="/marketplace"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#888",
          textDecoration: "none",
          fontSize: 14,
          marginBottom: 28,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Back to Marketplace
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#1e1e2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 32, height: 32, color: "#E91E8C" }} />
        </div>
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {vertical.name}
          </h1>
          <p style={{ fontSize: 15, color: "#888", margin: 0, marginTop: 4 }}>
            {vertical.descriptor}
          </p>
        </div>
      </div>

      <p
        style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.75)",
          lineHeight: 1.7,
          margin: 0,
          marginBottom: 36,
          maxWidth: 900,
        }}
      >
        {vertical.description}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 24,
        }}
      >
        <CoverageCard
          title="Workers' Compensation"
          icon={<Shield style={{ width: 24, height: 24, color: "#4fd1c5" }} />}
          badge="Workers' Compensation"
          description={vertical.wcDescription}
          features={vertical.wcFeatures}
          onStart={handleStartSubmission}
        />
        <CoverageCard
          title="Workforce Solution (PEO)"
          icon={<Users style={{ width: 24, height: 24, color: "#4fd1c5" }} />}
          badge="Workforce Solution (PEO)"
          description={vertical.peoDescription}
          features={vertical.peoFeatures}
          onStart={handleStartSubmission}
        />
      </div>
    </div>
  );
}

function CoverageCard({
  title,
  icon,
  badge,
  description,
  features,
  onStart,
}: {
  title: string;
  icon: React.ReactNode;
  badge: string;
  description: string;
  features: string[];
  onStart: () => void;
}) {
  return (
    <div
      style={{
        background: "#13131f",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.06)",
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
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "#1e1e2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>

      <span
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          fontSize: 12,
          fontWeight: 500,
          color: "#E91E8C",
          background: "rgba(233,30,140,0.1)",
          padding: "4px 10px",
          borderRadius: 20,
          marginBottom: 16,
        }}
      >
        {badge}
      </span>

      <p
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.6,
          margin: 0,
          marginBottom: 20,
        }}
      >
        {description}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 24,
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
                width: 18,
                height: 18,
                color: "#E91E8C",
                flexShrink: 0,
                marginTop: 1,
              }}
            />
            <span
              style={{
                fontSize: 14,
                color: textSecondary,
                lineHeight: 1.5,
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
          padding: "16px 24px",
          borderRadius: 28,
          border: "none",
          background: "#E91E8C",
          color: textPrimary,
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          transition: "opacity 0.15s",
          height: 56,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Start Submission
      </button>
    </div>
  );
}
