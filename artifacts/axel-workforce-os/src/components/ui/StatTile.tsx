import { useThemeStore } from "@/lib/theme-store";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: "up" | "down";
}

export default function StatTile({ label, value, trend, trendDirection = "up" }: StatTileProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div
      style={{
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.6)",
          marginBottom: "8px",
        }}
      >
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <p
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: isDark ? "#fff" : "#111",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        {trend && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              fontSize: "12px",
              fontWeight: 500,
              color: trendDirection === "up" ? "#22c55e" : "#ef4444",
            }}
          >
            {trendDirection === "up" ? (
              <TrendingUp style={{ width: "12px", height: "12px" }} />
            ) : (
              <TrendingDown style={{ width: "12px", height: "12px" }} />
            )}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
