import type { LucideIcon } from "lucide-react";
import { useThemeColors } from "@/lib/use-theme-colors";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}

export default function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  const { textPrimary, textMuted, cardBg, borderColor } = useThemeColors();
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent-primary-soft)" }}
        >
          <Icon className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
        </div>
        {trend && (
          <span className="text-xs font-medium" style={{ color: "#22c55e" }}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: textPrimary }}>
        {value}
      </p>
      <p className="text-sm mt-0.5" style={{ color: textMuted }}>
        {label}
      </p>
    </div>
  );
}
