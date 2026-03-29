import { useNavigate } from "react-router-dom";
import { useThemeStore } from "@/lib/theme-store";
import { VERTICALS } from "@/lib/vertical-data";

export default function Marketplace() {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "#888" : "#666";
  const cardBg = isDark ? "#13131f" : "#f5f5f7";
  const cardHoverBg = isDark ? "#16162a" : "#eeeef2";
  const cardBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const cardHoverBorder = "rgba(233,30,140,0.3)";
  const iconBg = isDark ? "#1e1e2e" : "#e8e8f0";

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            marginBottom: 8,
          }}
        >
          Marketplace
        </h1>
        <p
          style={{
            fontSize: 15,
            color: textMuted,
            margin: 0,
          }}
        >
          Explore our coverage verticals and find the right solutions for your clients.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 20,
        }}
      >
        {VERTICALS.map((v) => (
          <button
            key={v.slug}
            type="button"
            onClick={() => navigate(`/marketplace/${v.slug}`)}
            style={{
              background: cardBg,
              borderRadius: 16,
              border: `1px solid ${cardBorder}`,
              padding: 24,
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = cardHoverBorder;
              e.currentTarget.style.background = cardHoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = cardBorder;
              e.currentTarget.style.background = cardBg;
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                background: iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <v.icon style={{ width: 28, height: 28, color: "#E91E8C" }} />
            </div>

            <div>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: textPrimary,
                  margin: 0,
                  marginBottom: 6,
                  lineHeight: 1.3,
                }}
              >
                {v.name}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: textMuted,
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {v.descriptor}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
