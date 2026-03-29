import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { Users, Shield, RefreshCw, ClipboardList, FileText } from "lucide-react";

export default function CsaDashboard() {
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => api.get<any[]>("/contacts") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<any[]>("/tasks") });

  const activePolicies = policies.filter((p: any) => p.status === "ACTIVE");
  const openTasks = tasks.filter((t: any) => t.status !== "COMPLETE");

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">CSA Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Client servicing and account management
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="My Clients" value={contacts.length} icon={Users} />
        <StatCard label="Active Policies" value={activePolicies.length} icon={Shield} />
        <StatCard label="Upcoming Renewals" value={0} icon={RefreshCw} />
        <StatCard label="Open Tasks" value={openTasks.length} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Client Contacts</h3>
          </div>
          {contacts.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No clients assigned</p>
          ) : (
            <div className="space-y-3">
              {contacts.slice(0, 6).map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {c.email || "—"} · {c.role || "—"}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                  >
                    {c.type || "Contact"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">My Tasks</h3>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>All tasks complete</p>
          ) : (
            <div className="space-y-3">
              {openTasks.slice(0, 6).map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{t.title}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: t.priority === "HIGH" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                      color: t.priority === "HIGH" ? "#ef4444" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4" style={{ color: "#E91E8C" }} />
          <h3 className="text-base font-semibold text-white">Active Policies</h3>
        </div>
        {policies.length === 0 ? (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No active policies</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {policies.slice(0, 6).map((p: any) => (
              <div
                key={p.id}
                className="p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-sm font-medium text-white">{p.policyNumber}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {p.productType} · {p.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
