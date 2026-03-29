import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { ClipboardList, FileText, BarChart3, CheckCircle2 } from "lucide-react";

export default function VendorDashboard() {
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<any[]>("/tasks") });

  const openTasks = tasks.filter((t: any) => t.status !== "COMPLETE");
  const completedTasks = tasks.filter((t: any) => t.status === "COMPLETE");

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Vendor Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Your assigned tasks and deliverables
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Assigned Tasks" value={tasks.length} icon={ClipboardList} />
        <StatCard label="Open" value={openTasks.length} icon={FileText} />
        <StatCard label="Completed" value={completedTasks.length} icon={CheckCircle2} />
        <StatCard
          label="Completion Rate"
          value={tasks.length > 0 ? `${Math.round((completedTasks.length / tasks.length) * 100)}%` : "—"}
          icon={BarChart3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Open Tasks</h3>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No open tasks</p>
          ) : (
            <div className="space-y-3">
              {openTasks.slice(0, 8).map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{t.title}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {t.category || "—"} · Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background:
                        t.priority === "HIGH"
                          ? "rgba(239,68,68,0.15)"
                          : t.priority === "MEDIUM"
                            ? "rgba(234,179,8,0.15)"
                            : "rgba(255,255,255,0.06)",
                      color:
                        t.priority === "HIGH"
                          ? "#ef4444"
                          : t.priority === "MEDIUM"
                            ? "#eab308"
                            : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {t.priority || "NORMAL"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Completed Tasks</h3>
          </div>
          {completedTasks.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No completed tasks</p>
          ) : (
            <div className="space-y-3">
              {completedTasks.slice(0, 6).map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white line-through opacity-60">{t.title}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {t.category || "—"}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                  >
                    Done
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
