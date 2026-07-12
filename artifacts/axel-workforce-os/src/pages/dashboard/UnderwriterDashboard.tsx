import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, StatTile, SectionHeader, AxelBadge } from "@/components/ui/axel-index";
import { ListChecks, BarChart3, Shield } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function UnderwriterDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: rates = [] } = useQuery({ queryKey: ["pepm-rates"], queryFn: () => api.get<any[]>("/rate-tables/pepm") });

  const pendingDeals = deals.filter((d: any) => ["SUBMISSION_REVIEW", "UW_REVIEW"].includes(d.stage));

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const subtleBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="Underwriter Dashboard" subtitle="Deal review and approval center" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatTile label="Pending Review" value={pendingDeals.length} />
        <StatTile label="Total Deals" value={deals.length} />
        <StatTile label="Bound Policies" value={policies.length} />
        <StatTile label="Rate Entries" value={rates.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <ListChecks style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Underwriting Queue</h3>
          </div>
          {pendingDeals.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No deals pending review</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pendingDeals.map((d: any) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{d.referenceCode}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{d.vertical} · {d.state} · EEs: {d.employeeCount || "—"}</p>
                  </div>
                  <AxelBadge label="Review" color="pink" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <BarChart3 style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Rate Table Overview</h3>
          </div>
          {rates.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No rates configured</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rates.slice(0, 8).map((r: any) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "6px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                  <div>
                    <span style={{ fontSize: "14px", color: textSecondary }}>{r.vertical}</span>
                    <span style={{ fontSize: "12px", marginLeft: "8px", color: textMuted }}>{r.productType} · {r.employeeBandMin}-{r.employeeBandMax} EEs</span>
                  </div>
                  <span style={{ fontSize: "14px", fontFamily: "monospace", color: textPrimary }}>${r.pepmRate}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Shield style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Bound Policies</h3>
        </div>
        {policies.length === 0 ? (
          <p style={{ fontSize: "14px", color: textMuted }}>No bound policies yet</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {policies.slice(0, 4).map((p: any) => (
              <div key={p.id} style={{ padding: "12px", borderRadius: "8px", background: subtleBg, border: `1px solid ${borderSubtle}` }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{p.policyNumber}</p>
                <p style={{ fontSize: "12px", marginTop: "4px", color: textMuted }}>{p.productType} · {p.status}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
