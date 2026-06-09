import { useThemeColors } from "@/lib/use-theme-colors";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Shield,
  Users,
  Check,
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Monitor,
  HeartPulse,
  Scale,
  Heart,
  ClipboardList,
  UsersRound,
} from "lucide-react";
import { getVerticalBySlug } from "@/lib/vertical-data";

const BASE = import.meta.env.BASE_URL || "/";

const ACCENT = "var(--accent-primary)";

const PEO_SERVICES = [
  {
    icon: DollarSign,
    title: "Payroll",
    items: [
      "Full Service Payroll Platform",
      "Automated Payroll Processing",
      "Direct Deposits",
      "All Inclusive Payroll Tax Filing",
    ],
  },
  {
    icon: ShieldCheck,
    title: "HR & Compliance",
    items: [
      "State and Federal Compliance",
      "EEOC Claims Management",
      "Employee Handbook",
      "Regulatory Guidance",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Risk Management",
    items: [
      "Injury & Illness Prevention Programs",
      "Safety Manuals",
      "Employer & Employee Safety Training",
      "Facility Inspections",
    ],
  },
  {
    icon: Monitor,
    title: "HR Platform Technology",
    items: [
      "Unified Platform",
      "Electronic Onboarding",
      "Time & Attendance",
      "Employee Self Service Portal",
    ],
  },
  {
    icon: HeartPulse,
    title: "Workers' Compensation",
    items: [
      "Medical Benefits",
      "Disability Benefits",
      "Vocational Rehabilitation",
      "Return to Work Program",
      "Superior Claims Handling",
    ],
  },
  {
    icon: Scale,
    title: "EPLI Insurance",
    items: ["Sexual Harassment", "Wrongful Termination", "Discrimination"],
  },
  {
    icon: Heart,
    title: "Rich Benefits",
    items: [
      "Major Medical, Dental & Vision",
      "Employee Wellness",
      "Telemedicine",
      "401(k) Retirement Planning",
    ],
  },
];

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

  const handleStartAsoQuote = () => {
    navigate("/marketplace/quote/wizard", {
      state: { vertical: vertical.name, coverageType: "ASO" },
    });
  };

  const ASO_FEATURES = [
    "Superior HR management platform",
    "Full-service payroll & tax filing",
    "HR administration & compliance",
    "Benefits administration",
    "Time & attendance",
    "Employee handbook & policies",
    "You keep your own WC policy",
  ];

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
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 25,
        }}
      >
        <CoverageCard
          title="WorkShield (Workers' Comp)"
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
          description={vertical.wcDescription}
          features={vertical.wcFeatures}
          onStart={handleStartSubmission}
          ctaLabel="Start Submission"
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
          description={vertical.peoDescription}
          features={vertical.peoFeatures}
          onStart={handleStartSubmission}
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
          badge="ASO"
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
          description="Keep full employer control while outsourcing HR, payroll, benefits admin, and compliance. No co-employment required."
          features={ASO_FEATURES}
          onStart={handleStartAsoQuote}
          ctaLabel="Get ASO Quote"
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          textMuted={textMuted}
          cardBg={cardBg}
          borderColor={borderColor}
        />
      </div>

      <ProgramOfferingSection
        verticalName={vertical.name}
        isDark={isDark}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        textMuted={textMuted}
        cardBg={cardBg}
        borderColor={borderColor}
      />
    </div>
  );
}

function ProgramOfferingSection({
  verticalName,
  isDark,
  textPrimary,
  textSecondary,
  textMuted,
  cardBg,
  borderColor,
}: {
  verticalName: string;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  borderColor: string;
}) {
  const iconBg = isDark ? "rgba(233,30,140,0.10)" : "rgba(233,30,140,0.08)";
  const bulletColor = ACCENT;

  return (
    <section style={{ marginTop: 56 }}>
      <div style={{ marginBottom: 24 }}>
        <p
          style={{
            fontFamily: "var(--app-font-heading)",
            fontSize: 11,
            fontWeight: 200,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: ACCENT,
            margin: 0,
            marginBottom: 8,
          }}
        >
          What's included in a PEO?
        </p>
        <h2
          style={{
            fontFamily: "var(--app-font-heading)",
            fontSize: 24,
            fontWeight: 300,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: textPrimary,
            margin: 0,
            marginBottom: 10,
            lineHeight: 1.2,
          }}
        >
          Program Offering
        </h2>
        <p
          style={{
            fontSize: 14,
            color: textMuted,
            margin: 0,
            maxWidth: 720,
            lineHeight: 1.6,
          }}
        >
          Everything your {verticalName.toLowerCase()} operation needs, bundled
          under one roof.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {PEO_SERVICES.map((svc) => {
          const Icon = svc.icon;
          return (
            <div
              key={svc.title}
              style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: 12,
                padding: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: 18, height: 18, color: ACCENT }} />
                </div>
                <h3
                  style={{
                    fontFamily: "var(--app-font-heading)",
                    fontSize: 13,
                    fontWeight: 400,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: textPrimary,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {svc.title}
                </h3>
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                {svc.items.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 13,
                      color: textSecondary,
                      paddingLeft: 14,
                      position: "relative",
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 7,
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        background: bulletColor,
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CoverageCard({
  title,
  icon,
  description,
  features,
  onStart,
  ctaLabel,
  badge,
  subtitle,
  eyebrow,
  featuresHeading,
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
  ctaLabel?: string;
  badge?: string;
  subtitle?: string;
  eyebrow?: string;
  featuresHeading?: string;
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
        {featuresHeading && (
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: textPrimary,
              margin: 0,
              marginBottom: 5,
              lineHeight: 1.4,
            }}
          >
            {featuresHeading}
          </p>
        )}
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
