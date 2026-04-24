import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VERTICALS } from "@/lib/vertical-data";
import { useThemeColors } from "@/lib/use-theme-colors";

const BASE = import.meta.env.BASE_URL || "/";

export default function Marketplace() {
  const navigate = useNavigate();
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const { textPrimary, textMuted } = useThemeColors();

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 32 }}>
        <p
          style={{
            fontFamily: "var(--app-font-heading)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#E91E8C",
            margin: 0,
            marginBottom: 8,
          }}
        >
          Marketplace
        </p>
        <h1
          style={{
            fontFamily: "var(--app-font-heading)",
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            color: textPrimary,
            margin: 0,
            marginBottom: 8,
          }}
        >
          Solutions for businesses in every sector
        </h1>
        <p
          style={{
            fontSize: 15,
            color: textMuted,
            margin: 0,
          }}
        >
          Explore our coverage verticals and find the right solutions for your
          clients.
        </p>
      </div>

      <div className="marketplace-grid">
        {VERTICALS.map((v) => {
          const isHovered = hoveredSlug === v.slug;
          return (
            <button
              key={v.slug}
              type="button"
              onClick={() => navigate(`/marketplace/${v.slug}`)}
              onMouseEnter={() => setHoveredSlug(v.slug)}
              onMouseLeave={() => setHoveredSlug(null)}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: 6,
                border: "none",
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                background: "#1a1a26",
                transition: "transform 0.2s",
                transform: isHovered ? "scale(1.015)" : "scale(1)",
              }}
            >
              <img
                src={`${BASE}${v.image.replace(/^\//, "")}`}
                alt={v.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: isHovered
                    ? "brightness(0.95) saturate(1.05)"
                    : "brightness(0.85) saturate(1)",
                  transition: "filter 0.3s, transform 0.3s",
                  transform: isHovered ? "scale(1.04)" : "scale(1)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  bottom: 14,
                  left: 16,
                  right: 16,
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--app-font-heading)",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#fff",
                    margin: 0,
                    lineHeight: 1.2,
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                  }}
                >
                  {v.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
