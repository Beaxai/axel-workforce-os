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
            fontWeight: 200,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#E91E8C",
            margin: 0,
            marginBottom: 10,
          }}
        >
          Marketplace
        </p>
        <h1
          style={{
            fontFamily: "var(--app-font-heading)",
            fontSize: 36,
            fontWeight: 300,
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
                aspectRatio: "4 / 3",
                borderRadius: 8,
                border: "none",
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                background: "#0e0e14",
                transition: "transform 0.25s ease",
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
                    ? "grayscale(0) brightness(0.9) saturate(1.05)"
                    : "grayscale(1) brightness(0.55)",
                  transition: "filter 0.4s ease, transform 0.5s ease",
                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: isHovered
                    ? "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.55) 100%)"
                    : "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.7) 100%)",
                  transition: "background 0.4s ease",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 18,
                  left: 20,
                  right: 20,
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    margin: 0,
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    textShadow: "0 1px 4px rgba(0,0,0,0.55)",
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
