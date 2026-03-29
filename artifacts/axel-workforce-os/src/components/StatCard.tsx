import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}

export default function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(233,30,140,0.15)" }}
        >
          <Icon className="w-4 h-4" style={{ color: "#E91E8C" }} />
        </div>
        {trend && (
          <span className="text-xs font-medium" style={{ color: "#22c55e" }}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </p>
    </div>
  );
}
