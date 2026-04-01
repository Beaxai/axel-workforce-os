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
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <p
          style={{
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
            fontSize: 28,
            fontWeight: 700,
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
        }}
      >
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
                borderRadius: 8,
                border: "none",
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                background: "#1a1a26",
                transition: "transform 0.2s",
                transform: isHovered ? "scale(1.02)" : "scale(1)",
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
                  filter: "brightness(0.55) grayscale(0.3)",
                  transition: "filter 0.3s, transform 0.3s",
                  ...(isHovered
                    ? {
                        filter: "brightness(0.7) grayscale(0)",
                        transform: "scale(1.05)",
                      }
                    : {}),
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.5) 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  right: 16,
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    margin: 0,
                    lineHeight: 1.3,
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
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
