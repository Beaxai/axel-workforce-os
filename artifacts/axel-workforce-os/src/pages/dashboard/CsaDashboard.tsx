import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, StatTile, SectionHeader, AxelBadge } from "@/components/ui/axel-index";
import { Users, ClipboardList, Shield } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function CsaDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => api.get<any[]>("/contacts") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<any[]>("/tasks") });

  const activePolicies = policies.filter((p: any) => p.status === "ACTIVE");
  const openTasks = tasks.filter((t: any) => t.status !== "COMPLETE");

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const subtleBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="CSA Dashboard" subtitle="Client servicing and account management" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatTile label="My Clients" value={contacts.length} />
        <StatTile label="Active Policies" value={activePolicies.length} />
        <StatTile label="Upcoming Renewals" value={0} />
        <StatTile label="Open Tasks" value={openTasks.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Users style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Client Contacts</h3>
          </div>
          {contacts.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No clients assigned</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {contacts.slice(0, 6).map((c: any) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{c.firstName} {c.lastName}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{c.email || "—"} · {c.role || "—"}</p>
                  </div>
                  <AxelBadge label={c.type || "Contact"} color="gray" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <ClipboardList style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>My Tasks</h3>
          </div>
          {openTasks.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>All tasks complete</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {openTasks.slice(0, 6).map((t: any) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{t.title}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</p>
                  </div>
                  <AxelBadge label={t.status} color={t.priority === "HIGH" ? "red" : "gray"} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Shield style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Active Policies</h3>
        </div>
        {policies.length === 0 ? (
          <p style={{ fontSize: "14px", color: textMuted }}>No active policies</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {policies.slice(0, 6).map((p: any) => (
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
