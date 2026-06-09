import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, StatTile, SectionHeader, AxelBadge } from "@/components/ui/axel-index";
import { Shield, BarChart3 } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function CarrierDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: commissions = [] } = useQuery({ queryKey: ["commissions"], queryFn: () => api.get<any[]>("/commissions") });

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const subtleBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="Carrier Dashboard" subtitle="Bound business and claims overview" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatTile label="Bound Policies" value={policies.length} />
        <StatTile label="Open Claims" value={0} />
        <StatTile label="Commission Entries" value={commissions.length} />
        <StatTile label="Loss Ratio" value="—" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Shield style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Bound Policies</h3>
          </div>
          {policies.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No bound policies</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {policies.slice(0, 6).map((p: any) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{p.policyNumber}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{p.productType} · Eff: {p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : "—"}</p>
                  </div>
                  <AxelBadge label={p.status} color={p.status === "ACTIVE" ? "green" : "gray"} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <BarChart3 style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Performance Summary</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { label: "Written Premium", value: "$0" },
              { label: "Claims Paid", value: "$0" },
              { label: "Loss Ratio", value: "N/A" },
              { label: "Active Employers", value: "0" },
            ].map((item) => (
              <div key={item.label} style={{ padding: "12px", borderRadius: "8px", textAlign: "center", background: subtleBg, border: `1px solid ${borderSubtle}` }}>
                <p style={{ fontSize: "20px", fontWeight: 700, color: textPrimary }}>{item.value}</p>
                <p style={{ fontSize: "12px", color: textMuted }}>{item.label}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
