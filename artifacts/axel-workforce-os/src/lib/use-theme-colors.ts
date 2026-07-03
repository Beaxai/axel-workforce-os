import { useThemeStore } from "./theme-store";

export function useThemeColors() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return {
    isDark,
    textPrimary: isDark ? "#fff" : "#111",
    textSecondary: isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.68)",
    textMuted: isDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.58)",
    bg: isDark ? "#060608" : "#f4f4f5",
    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    glassBg: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.8)",
    borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)",
    hoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    dropdownBg: isDark ? "rgba(30,30,35,0.95)" : "rgba(255,255,255,0.98)",

    // Form surface + text tokens — mirror the CSS variables in index.css so the
    // JS styling path and the CSS path read identical values per mode.
    inputBg: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
    inputBorder: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.15)",
    inputText: isDark ? "#fff" : "#111",
    inputPlaceholder: isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.40)",
    inputBgFocus: isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
    inputBorderFocus: isDark ? "#ff4ba6" : "#E91E8C",
    labelText: isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.65)",
    sectionHeading: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.80)",

    // Modal overlay tokens — mirror --overlay-bg / --overlay-blur in index.css.
    // Prefer var(--overlay-bg)/var(--overlay-blur) in inline styles so the
    // values re-resolve on theme flip; these mirrors exist for JS-only paths.
    overlayBg: isDark ? "rgba(0,0,0,0.68)" : "rgba(15,15,20,0.40)",
    overlayBlur: "blur(12px)",

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
