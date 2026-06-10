import { useThemeStore } from "@/lib/theme-store";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div style={{ marginBottom: "24px" }}>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: isDark ? "#fff" : "#111",
          margin: 0,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontSize: "14px",
            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.6)",
            marginTop: "4px",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
