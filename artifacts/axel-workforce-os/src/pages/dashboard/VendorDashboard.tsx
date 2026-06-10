import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, StatTile, SectionHeader, AxelBadge } from "@/components/ui/axel-index";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function VendorDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<any[]>("/tasks") });

  const openTasks = tasks.filter((t: any) => t.status !== "COMPLETE");
  const completedTasks = tasks.filter((t: any) => t.status === "COMPLETE");

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="Vendor Dashboard" subtitle="Your assigned tasks and deliverables" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatTile label="Assigned Tasks" value={tasks.length} />
        <StatTile label="Open" value={openTasks.length} />
        <StatTile label="Completed" value={completedTasks.length} />
        <StatTile label="Completion Rate" value={tasks.length > 0 ? `${Math.round((completedTasks.length / tasks.length) * 100)}%` : "—"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <ClipboardList style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Open Tasks</h3>
          </div>
          {openTasks.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No open tasks</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {openTasks.slice(0, 8).map((t: any) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{t.title}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{t.category || "—"} · Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</p>
                  </div>
                  <AxelBadge
                    label={t.priority || "NORMAL"}
                    color={t.priority === "HIGH" ? "red" : t.priority === "MEDIUM" ? "yellow" : "gray"}
                  />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--accent-primary)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Completed Tasks</h3>
          </div>
          {completedTasks.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No completed tasks</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {completedTasks.slice(0, 6).map((t: any) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, textDecoration: "line-through", opacity: 0.6 }}>{t.title}</p>
                    <p style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}>{t.category || "—"}</p>
                  </div>
                  <AxelBadge label="Done" color="green" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
