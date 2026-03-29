import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, StatTile, SectionHeader, AxelBadge } from "@/components/ui/axel-index";
import { Shield, Receipt, Rocket } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function EmployerDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => api.get<any[]>("/employees") });

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const subtleBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="Employer Dashboard" subtitle="Your account overview" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatTile label="Active Policies" value={policies.length} />
        <StatTile label="Employees" value={employees.length} />
        <StatTile label="Open Claims" value={0} />
        <StatTile label="Documents" value={0} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Shield style={{ width: "16px", height: "16px", color: "#E91E8C" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>My Policies</h3>
          </div>
          {policies.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No active policies</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {policies.map((p: any) => (
                <div key={p.id} style={{ padding: "12px", borderRadius: "8px", background: subtleBg, border: `1px solid ${borderSubtle}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: 0 }}>{p.policyNumber}</p>
                    <AxelBadge label={p.status} color={p.status === "ACTIVE" ? "green" : "gray"} />
                  </div>
                  <p style={{ fontSize: "12px", marginTop: "4px", color: textMuted }}>
                    {p.productType} · Eff: {p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Receipt style={{ width: "16px", height: "16px", color: "#E91E8C" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Payroll / Billing</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ padding: "12px", borderRadius: "8px", textAlign: "center", background: subtleBg, border: `1px solid ${borderSubtle}` }}>
                <p style={{ fontSize: "20px", fontWeight: 700, color: textPrimary }}>{employees.length}</p>
                <p style={{ fontSize: "12px", color: textMuted }}>Active Employees</p>
              </div>
              <div style={{ padding: "12px", borderRadius: "8px", textAlign: "center", background: subtleBg, border: `1px solid ${borderSubtle}` }}>
                <p style={{ fontSize: "20px", fontWeight: 700, color: textPrimary }}>$0</p>
                <p style={{ fontSize: "12px", color: textMuted }}>Current Invoice</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Rocket style={{ width: "16px", height: "16px", color: "#E91E8C" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>PEO Onboarding</h3>
            </div>
            <div style={{ width: "100%", height: "8px", borderRadius: "9999px", overflow: "hidden", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <div style={{ height: "100%", borderRadius: "9999px", width: "0%", background: "#E91E8C" }} />
            </div>
            <p style={{ fontSize: "12px", marginTop: "8px", color: textMuted }}>No onboarding in progress</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
