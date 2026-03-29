import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, StatTile, SectionHeader, AxelBadge } from "@/components/ui/axel-index";
import { ArrowUpRight } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function AdminDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { data: orgs = [] } = useQuery({ queryKey: ["organizations"], queryFn: () => api.get<any[]>("/organizations") });
  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => api.get<any[]>("/contacts") });
  const { data: workforce = [] } = useQuery({ queryKey: ["workforce-verticals"], queryFn: () => api.get<any[]>("/workforce/verticals") });

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const subtleBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  const stageColor: Record<string, string> = {
    NEW_LEAD: "blue",
    QUOTING: "yellow",
    PROPOSAL: "pink",
    BOUND: "green",
    LOST: "red",
  };

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="Admin Dashboard" subtitle="Complete platform overview" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatTile label="Organizations" value={orgs.length} />
        <StatTile label="Active Deals" value={deals.length} />
        <StatTile label="Policies" value={policies.length} />
        <StatTile label="Contacts" value={contacts.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Recent Deals</h3>
          {deals.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No deals yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {deals.slice(0, 5).map((d: any) => (
                <div
                  key={d.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}
                >
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{d.referenceCode}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{d.vertical || "—"} · {d.state || "—"}</p>
                  </div>
                  <AxelBadge label={d.stage?.replace(/_/g, " ") || "—"} color={stageColor[d.stage] || "gray"} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Pipeline Summary</h3>
          {deals.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No pipeline data</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {Object.entries(
                deals.reduce((acc: Record<string, number>, d: any) => {
                  const stage = d.stage || "UNKNOWN";
                  acc[stage] = (acc[stage] || 0) + 1;
                  return acc;
                }, {})
              ).map(([stage, count]) => (
                <div key={stage} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "14px", color: textSecondary }}>{stage.replace(/_/g, " ")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "96px", height: "8px", borderRadius: "9999px", overflow: "hidden", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                      <div style={{ height: "100%", borderRadius: "9999px", width: `${((count as number) / deals.length) * 100}%`, background: "#E91E8C" }} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, width: "24px", textAlign: "right" }}>{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Workforce Verticals</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {workforce.slice(0, 6).map((v: any) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "6px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                <span style={{ fontSize: "14px", color: textSecondary }}>{v.vertical}</span>
                <span style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{v.clientCount} clients</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Quick Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { label: "New Deal", desc: "Create a new pipeline entry" },
              { label: "Add Organization", desc: "Register a new org" },
              { label: "View Reports", desc: "Analytics and insights" },
              { label: "Manage Tasks", desc: "View task queue" },
            ].map((action) => (
              <button
                key={action.label}
                style={{ textAlign: "left", padding: "16px", borderRadius: "12px", background: subtleBg, border: `1px solid ${borderSubtle}`, cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(233,30,140,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = borderSubtle)}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: 0 }}>{action.label}</p>
                  <ArrowUpRight style={{ width: "14px", height: "14px", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }} />
                </div>
                <p style={{ fontSize: "12px", marginTop: "4px", color: textMuted }}>{action.desc}</p>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
