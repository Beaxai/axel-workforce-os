import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, ROLE_LABELS, ROLE_PATHS, type PartyRole } from "@/lib/auth-store";
import { useThemeStore } from "@/lib/theme-store";

const DEMO_USERS: Record<PartyRole, { firstName: string; lastName: string; email: string }> = {
  ADMIN: { firstName: "Sarah", lastName: "Mitchell", email: "sarah@axelwos.com" },
  UNDERWRITER: { firstName: "James", lastName: "Chen", email: "james@axelwos.com" },
  CSA: { firstName: "Maria", lastName: "Rodriguez", email: "maria@axelwos.com" },
  AGENT: { firstName: "Robert", lastName: "Banks", email: "robert@broker.com" },
  EMPLOYER: { firstName: "Lisa", lastName: "Thompson", email: "lisa@acmecorp.com" },
  CARRIER: { firstName: "David", lastName: "Park", email: "david@carrier.com" },
  PEO: { firstName: "Karen", lastName: "White", email: "karen@peopartner.com" },
  VENDOR: { firstName: "Mike", lastName: "Johnson", email: "mike@vendor.com" },
};

const ROLES: PartyRole[] = [
  "ADMIN", "UNDERWRITER", "CSA", "AGENT",
  "EMPLOYER", "CARRIER", "PEO", "VENDOR",
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { theme } = useThemeStore();
  const [selectedRole, setSelectedRole] = useState<PartyRole | null>(null);

  const isDark = theme === "dark";

  const handleLogin = () => {
    if (!selectedRole) return;
    const demo = DEMO_USERS[selectedRole];
    login({
      id: crypto.randomUUID(),
      email: demo.email,
      firstName: demo.firstName,
      lastName: demo.lastName,
      role: selectedRole,
      orgId: "axel-internal",
      orgName: "Axel Workforce Solutions",
    });
    navigate(ROLE_PATHS[selectedRole]);
  };

  const bg = isDark ? "#060608" : "#f4f4f5";
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const subtleBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src={`${import.meta.env.BASE_URL || "/"}images/axel-logo.png`}
            alt="Axel Workforce OS"
            style={{
              height: "40px",
              width: "auto",
              objectFit: "contain",
              margin: "0 auto 16px",
              display: "block",
              filter: isDark ? "brightness(0) invert(1)" : "none",
            }}
          />
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: textPrimary, margin: 0 }}>
            Axel Workforce OS
          </h1>
          <p style={{ fontSize: "14px", marginTop: "8px", color: textMuted }}>
            Select your role to enter the platform
          </p>
        </div>

        <div
          style={{
            borderRadius: "16px",
            padding: "24px",
            background: cardBg,
            border: `1px solid ${borderColor}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 500,
              marginBottom: "12px",
              color: textMuted,
            }}
          >
            SELECT PARTY ROLE
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background:
                    selectedRole === role ? "rgba(124,58,237,0.15)" : cardBg,
                  border:
                    selectedRole === role
                      ? "1px solid rgba(124,58,237,0.4)"
                      : `1px solid ${borderColor}`,
                  color: selectedRole === role ? "var(--accent-primary)" : (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"),
                }}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          {selectedRole && (
            <div
              style={{
                borderRadius: "12px",
                padding: "12px",
                marginBottom: "16px",
                background: subtleBg,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              }}
            >
              <p style={{ fontSize: "12px", color: textMuted }}>Signing in as</p>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: textPrimary,
                  marginTop: "2px",
                }}
              >
                {DEMO_USERS[selectedRole].firstName} {DEMO_USERS[selectedRole].lastName}
              </p>
              <p style={{ fontSize: "12px", color: textMuted }}>
                {DEMO_USERS[selectedRole].email}
              </p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!selectedRole}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
              border: "none",
              cursor: selectedRole ? "pointer" : "not-allowed",
              background: selectedRole ? "var(--gradient-cta)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
              opacity: selectedRole ? 1 : 0.5,
              transition: "filter 0.15s",
            }}
            onMouseEnter={(e) => {
              if (selectedRole) e.currentTarget.style.filter = "brightness(1.1)";
            }}
            onMouseLeave={(e) => {
              if (selectedRole) e.currentTarget.style.filter = "none";
            }}
          >
            Enter Platform
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            marginTop: "24px",
            color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
          }}
        >
          Demo environment — all roles available for exploration
        </p>
      </div>
    </div>
  );
}
