import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, StatTile, SectionHeader, AxelBadge } from "@/components/ui/axel-index";
import { Briefcase, Users } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function PeoDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { data: workforce = [] } = useQuery({ queryKey: ["workforce-verticals"], queryFn: () => api.get<any[]>("/workforce/verticals") });
  const { data: orgs = [] } = useQuery({ queryKey: ["organizations"], queryFn: () => api.get<any[]>("/organizations") });

  const totalEmployees = workforce.reduce((sum: number, v: any) => sum + (v.totalEmployees || 0), 0);
  const totalPayroll = workforce.reduce((sum: number, v: any) => sum + parseFloat(v.totalPayroll || "0"), 0);

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="PEO Partner Dashboard" subtitle="PEO client and workforce overview" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatTile label="PEO Clients" value={orgs.filter((o: any) => o.type === "CLIENT").length} />
        <StatTile label="Total Employees" value={totalEmployees} />
        <StatTile label="Total Payroll" value={`$${totalPayroll.toLocaleString()}`} />
        <StatTile label="Verticals" value={workforce.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Briefcase style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Workforce by Vertical</h3>
          </div>
          {workforce.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No workforce data</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {workforce.map((v: any) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{v.vertical}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{v.clientCount} clients · {v.totalEmployees} employees</p>
                  </div>
                  <span style={{ fontSize: "14px", fontFamily: "monospace", color: textPrimary }}>${parseFloat(v.totalPayroll || "0").toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Users style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Client Organizations</h3>
          </div>
          {orgs.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No organizations</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {orgs.slice(0, 6).map((o: any) => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{o.name}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{o.vertical || "—"} · {o.type}</p>
                  </div>
                  <AxelBadge label={o.status} color={o.status === "ACTIVE" ? "green" : "gray"} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
