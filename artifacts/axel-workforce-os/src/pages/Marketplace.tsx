import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "@/lib/theme-store";
import {
  Siren,
  Cannabis,
  HardHat,
  Trash2,
  HeartPulse,
  TriangleAlert,
  UtensilsCrossed,
  Factory,
  UsersRound,
  Truck,
  BarChart3,
  X,
  type LucideIcon,
} from "lucide-react";

interface Vertical {
  name: string;
  descriptor: string;
  icon: LucideIcon;
}

const VERTICALS: Vertical[] = [
  { name: "Ambulances & Emergency Transport", descriptor: "Coverage built for first responders on the move", icon: Siren },
  { name: "Cannabis", descriptor: "Compliant coverage for a growing industry", icon: Cannabis },
  { name: "Construction", descriptor: "Protect your crew from the ground up", icon: HardHat },
  { name: "Garbage & Waste Management", descriptor: "Reliable coverage for essential services", icon: Trash2 },
  { name: "Healthcare", descriptor: "Caring for those who care for others", icon: HeartPulse },
  { name: "High Experience Mod \u2013 Hard to Place Risks", descriptor: "Solutions when others say no", icon: TriangleAlert },
  { name: "Hospitality", descriptor: "Coverage as welcoming as your service", icon: UtensilsCrossed },
  { name: "Manufacturing", descriptor: "Engineered protection for your workforce", icon: Factory },
  { name: "Staffing", descriptor: "Temporary & contract workforce", icon: UsersRound },
  { name: "Transportation", descriptor: "Trucking, logistics, delivery", icon: Truck },
  { name: "All Other Industries", descriptor: "If it's not listed, we'll find a solution", icon: BarChart3 },
];

export default function Marketplace() {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "#888" : "#666";
  const cardBg = isDark ? "#13131f" : "#f5f5f7";
  const cardHoverBg = isDark ? "#16162a" : "#eeeef2";
  const cardBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const cardHoverBorder = "rgba(233,30,140,0.3)";
  const iconBg = isDark ? "#1e1e2e" : "#e8e8f0";
  const modalBg = isDark ? "#13131f" : "#fff";
  const modalBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const ghostBtnBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const ghostBtnHoverBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const ghostBtnBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
  const closeBtnColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

  const handleCardClick = (verticalName: string) => {
    setSelectedVertical(verticalName);
  };

  const handleQuoteSelect = (quoteType: "WC" | "PEO") => {
    if (!selectedVertical) return;
    navigate("/marketplace/quote/new", { state: { vertical: selectedVertical, quoteType } });
    setSelectedVertical(null);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedVertical) {
        setSelectedVertical(null);
      }
    },
    [selectedVertical],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
            key={v.name}
            type="button"
            onClick={() => handleCardClick(v.name)}
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

      {selectedVertical && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select Quote Type"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setSelectedVertical(null)}
        >
          <div
            style={{
              background: modalBg,
              borderRadius: 16,
              border: `1px solid ${modalBorder}`,
              padding: 32,
              width: 400,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: textPrimary,
                  margin: 0,
                }}
              >
                Select Quote Type
              </h2>
              <button
                type="button"
                onClick={() => setSelectedVertical(null)}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  color: closeBtnColor,
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = textPrimary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = closeBtnColor)}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <p
              style={{
                fontSize: 14,
                color: textMuted,
                margin: 0,
                marginBottom: 20,
              }}
            >
              {selectedVertical}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="button"
                onClick={() => handleQuoteSelect("WC")}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "#E91E8C",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                WC Quote
              </button>
              <button
                type="button"
                onClick={() => handleQuoteSelect("PEO")}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 10,
                  border: `1px solid ${ghostBtnBorder}`,
                  background: ghostBtnBg,
                  color: textPrimary,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = ghostBtnHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = ghostBtnBg)}
              >
                PEO Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
