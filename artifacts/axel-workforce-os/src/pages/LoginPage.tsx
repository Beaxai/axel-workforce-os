import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiError } from "@workspace/api-client-react";
import { useAuthStore, ROLE_PATHS, type PartyRole } from "@/lib/auth-store";
import { useThemeStore } from "@/lib/theme-store";

const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === "true";

// Quick-fill credentials for local exploration only (gated on VITE_DEV_AUTH).
const DEV_USERS: { label: string; role: PartyRole; email: string }[] = [
  { label: "Admin", role: "ADMIN", email: "sarah@axelwos.com" },
  { label: "Underwriter", role: "UNDERWRITER", email: "james@axelwos.com" },
  { label: "CSA", role: "CSA", email: "maria@axelwos.com" },
  { label: "Agent", role: "AGENT", email: "robert@broker.com" },
  { label: "Employer", role: "EMPLOYER", email: "lisa@acmecorp.com" },
  { label: "Carrier", role: "CARRIER", email: "david@carrier.com" },
  { label: "PEO", role: "PEO", email: "karen@peopartner.com" },
  { label: "Vendor", role: "VENDOR", email: "mike@vendor.com" },
];

const DEV_PASSWORD = "Password123!";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await signIn(email.trim(), password);
      navigate(fromPath || ROLE_PATHS[user.role], { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Unable to sign in. Please try again.");
      }
      setSubmitting(false);
    }
  };

  const quickFill = (devEmail: string) => {
    setEmail(devEmail);
    setPassword(DEV_PASSWORD);
    setError(null);
  };

  const bg = isDark ? "#060608" : "#f4f4f5";
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "14px",
    color: "var(--input-text)",
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    outline: "none",
    transition: "border-color 0.15s, background 0.15s",
  };

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
            Sign in to your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            borderRadius: "16px",
            padding: "24px",
            background: cardBg,
            border: `1px solid ${borderColor}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 500,
              marginBottom: "6px",
              color: "var(--label-text)",
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            style={{ ...inputStyle, marginBottom: "16px" }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--input-border-focus)";
              e.currentTarget.style.background = "var(--input-bg-focus)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--input-border)";
              e.currentTarget.style.background = "var(--input-bg)";
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 500,
              marginBottom: "6px",
              color: "var(--label-text)",
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{ ...inputStyle, marginBottom: error ? "12px" : "20px" }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--input-border-focus)";
              e.currentTarget.style.background = "var(--input-bg-focus)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--input-border)";
              e.currentTarget.style.background = "var(--input-bg)";
            }}
          />

          {error && (
            <p style={{ fontSize: "13px", color: "#ef4444", margin: "0 0 16px" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={!email || !password || submitting}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
              border: "none",
              cursor: !email || !password || submitting ? "not-allowed" : "pointer",
              background:
                !email || !password
                  ? isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)"
                  : "var(--gradient-cta)",
              opacity: !email || !password ? 0.5 : 1,
              transition: "filter 0.15s",
            }}
            onMouseEnter={(e) => {
              if (email && password && !submitting) e.currentTarget.style.filter = "brightness(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "none";
            }}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {DEV_AUTH && (
          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              borderRadius: "12px",
              background: cardBg,
              border: `1px dashed ${borderColor}`,
            }}
          >
            <p style={{ fontSize: "11px", fontWeight: 600, color: textMuted, margin: "0 0 10px" }}>
              DEV QUICK-FILL
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {DEV_USERS.map((u) => (
                <button
                  key={u.role}
                  type="button"
                  onClick={() => quickFill(u.email)}
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    cursor: "pointer",
                    background: cardBg,
                    border: `1px solid ${borderColor}`,
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
