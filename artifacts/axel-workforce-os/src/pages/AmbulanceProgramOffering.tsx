import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Monitor,
  HeartPulse,
  Scale,
  Heart,
  Zap,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL || "/";

const SERVICES = [
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
    title: "Worker's Compensation",
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
    items: [
      "Sexual Harassment",
      "Wrongful Termination",
      "Discrimination",
    ],
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

export default function AmbulanceProgramOffering() {
  const navigate = useNavigate();

  const handleStartSubmission = () => {
    navigate("/marketplace/quote/service-type", {
      state: { vertical: "Ambulances & Emergency Transport" },
    });
  };

  return (
    <div style={{ maxWidth: 1200 }}>
      <Link
        to="/marketplace"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#888",
          textDecoration: "none",
          fontSize: 14,
          marginBottom: 24,
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
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 32,
          height: 380,
        }}
      >
        <img
          src={`${BASE}images/verticals/ambulances.png`}
          alt="Ambulances & Emergency Transport"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            height: "100%",
            padding: "40px 48px",
            gap: 48,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: "rgba(124,58,237,0.3)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: "1px solid rgba(124,58,237,0.4)",
            }}
          >
            <Zap style={{ width: 36, height: 36, color: "#A78BFA" }} />
          </div>

          <div style={{ maxWidth: 560 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#fff",
                margin: 0,
                marginBottom: 16,
                lineHeight: 1.2,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              Integrated Workforce Solutions Built for Emergency Transport
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.75)",
                margin: 0,
                lineHeight: 1.7,
                fontStyle: "italic",
              }}
            >
              Axel Workforce Solutions helps ambulance and emergency transport
              providers simplify workforce management by bringing HR, payroll,
              benefits, and workers&rsquo; compensation together in one
              integrated model. Built for high-pressure, regulated
              environments, our solution reduces administrative burden, supports
              compliance, and improves cost control&mdash;allowing organizations
              of any size to maintain readiness and focus on growth.
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            marginBottom: 6,
          }}
        >
          Program Offering
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.5)",
            margin: 0,
          }}
        >
          Everything your ambulance or emergency transport operation needs,
          under one roof.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {SERVICES.map((svc) => (
          <div
            key={svc.title}
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(124,58,237,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svc.icon
                  style={{ width: 18, height: 18, color: "#7C3AED" }}
                />
              </div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  margin: 0,
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
                gap: 8,
              }}
            >
              {svc.items.map((item) => (
                <li
                  key={item}
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)",
                    paddingLeft: 14,
                    position: "relative",
                    lineHeight: 1.4,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 6,
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: "#7C3AED",
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: 32,
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            marginBottom: 8,
          }}
        >
          Integrate insurance with a comprehensive HR platform
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.6)",
            margin: 0,
            lineHeight: 1.7,
            maxWidth: 900,
          }}
        >
          Ambulance and emergency transport organizations operate in demanding
          environments where workforce complexity and compliance requirements
          are constant. Axel Workforce Solutions integrates HR, payroll,
          benefits, and workers&rsquo; compensation into a streamlined platform
          that helps reduce costs, improve efficiency, and support regulatory
          needs. Designed to scale with your operation, our approach allows
          teams to stay focused on service delivery while we simplify the back
          office.
        </p>
      </div>

      <button
        type="button"
        onClick={handleStartSubmission}
        style={{
          width: "100%",
          padding: "18px 32px",
          borderRadius: 10,
          border: "none",
          background: "#7C3AED",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          transition: "opacity 0.15s",
          marginBottom: 32,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Start Submission
      </button>
    </div>
  );
}
