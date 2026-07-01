import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, StatTile, SectionHeader, AxelBadge } from "@/components/ui/axel-index";
import { Handshake, DollarSign, ArrowUpRight } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function AgentDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: commissions = [] } = useQuery({ queryKey: ["commissions"], queryFn: () => api.get<any[]>("/commissions") });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => api.get<any[]>("/contacts") });

  const activeDeals = deals.filter((d: any) => d.outcome !== "lost" && d.stage !== "BOUND");
  const totalCommissions = commissions.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0);

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const subtleBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="Agent Dashboard" subtitle="Your deals, clients, and commissions" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatTile label="Active Deals" value={activeDeals.length} />
        <StatTile label="Total Deals" value={deals.length} />
        <StatTile label="Clients" value={contacts.length} />
        <StatTile label="Commissions" value={`$${totalCommissions.toLocaleString()}`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Handshake style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>My Deals</h3>
          </div>
          {deals.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No deals submitted yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {deals.slice(0, 5).map((d: any) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{d.referenceCode}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{d.vertical} · {d.employeeCount || "—"} EEs</p>
                  </div>
                  <AxelBadge label={d.stage?.replace(/_/g, " ") || "—"} color={d.stage === "BOUND" ? "green" : "gray"} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <DollarSign style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Commission Statements</h3>
          </div>
          {commissions.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No commissions recorded</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {commissions.slice(0, 5).map((c: any) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>${parseFloat(c.amount || 0).toLocaleString()}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{c.commissionType} · {c.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Quick Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          {[
            { label: "Submit New Quote", desc: "Start a new deal submission" },
            { label: "View Commissions", desc: "Check your earnings" },
            { label: "Download Resources", desc: "Forms, guides, and templates" },
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
  );
}
