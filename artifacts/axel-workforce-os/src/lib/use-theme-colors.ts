import { useThemeStore } from "./theme-store";

export function useThemeColors() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return {
    isDark,
    textPrimary: isDark ? "#fff" : "#111",
    textSecondary: isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.6)",
    textMuted: isDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.45)",
    bg: isDark ? "#060608" : "#f4f4f5",
    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    glassBg: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.8)",
    borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)",
    hoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    dropdownBg: isDark ? "rgba(30,30,35,0.95)" : "rgba(255,255,255,0.98)",

    // Brand accent tokens — mirror the CSS variables in index.css so the JS
    // styling path and the CSS path read identical values. Pink = primary
    // interactive accent; purple = supporting accent.
    accentPrimary: "#E91E8C",
    accentPrimaryHover: "#d1187e",
    accentPrimaryFocus: "#ff4ba6",
    accentPrimarySoft: "rgba(233,30,140,0.15)",
    accentSupport: "#7C3AED",
    accentSupportHover: "#6D28D9",
    accentSupportSoft: "rgba(124,58,237,0.15)",
    gradientCta: "linear-gradient(135deg, #7C3AED 0%, #E91E8C 100%)",
  };
}
