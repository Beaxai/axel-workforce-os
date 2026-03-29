import type { ReactNode, CSSProperties } from "react";
import { useThemeStore } from "@/lib/theme-store";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  style?: CSSProperties;
}

export default function GlassCard({ children, className = "", padding = "20px", style }: GlassCardProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div
      className={className}
      style={{
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: "12px",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
