import { useThemeStore } from "./theme-store";

export function useThemeColors() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return {
    isDark,
    textPrimary: isDark ? "#fff" : "#111",
    textSecondary: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
    textMuted: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
    bg: isDark ? "#060608" : "#f4f4f5",
    cardBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    glassBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
    hoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    dropdownBg: isDark ? "rgba(30,30,35,0.95)" : "rgba(255,255,255,0.98)",
  };
}
