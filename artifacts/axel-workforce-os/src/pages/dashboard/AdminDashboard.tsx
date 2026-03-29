import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import {
  Building2,
  Handshake,
  Shield,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

export default function AdminDashboard() {
  const { data: orgs = [] } = useQuery({ queryKey: ["organizations"], queryFn: () => api.get<any[]>("/organizations") });
  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => api.get<any[]>("/employees") });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => api.get<any[]>("/contacts") });
  const { data: workforce = [] } = useQuery({ queryKey: ["workforce-verticals"], queryFn: () => api.get<any[]>("/workforce/verticals") });

  const totalEmployees = workforce.reduce((sum: number, v: any) => sum + (v.totalEmployees || 0), 0);

  const stageColors: Record<string, string> = {
    NEW_LEAD: "border-blue-500/30 text-blue-400",
    QUOTING: "border-yellow-500/30 text-yellow-400",
    PROPOSAL: "border-purple-500/30 text-purple-400",
    BOUND: "border-green-500/30 text-green-400",
    LOST: "border-red-500/30 text-red-400",
  };

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Complete platform overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Organizations" value={orgs.length} icon={Building2} />
        <StatCard label="Active Deals" value={deals.length} icon={Handshake} />
        <StatCard label="Policies" value={policies.length} icon={Shield} />
        <StatCard label="Contacts" value={contacts.length} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GlassCard>
          <h3 className="text-base font-semibold text-white mb-4">Recent Deals</h3>
          {deals.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No deals yet</p>
          ) : (
            <div className="space-y-3">
              {deals.slice(0, 5).map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{d.referenceCode}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {d.vertical || "—"} · {d.state || "—"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${stageColors[d.stage] || "border-white/10 text-white/50"}`}
                  >
                    {d.stage?.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-base font-semibold text-white mb-4">Pipeline Summary</h3>
          {deals.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No pipeline data</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                deals.reduce((acc: Record<string, number>, d: any) => {
                  const stage = d.stage || "UNKNOWN";
                  acc[stage] = (acc[stage] || 0) + 1;
                  return acc;
                }, {})
              ).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {stage.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-24 h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((count as number) / deals.length) * 100}%`,
                          background: "#E91E8C",
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-white w-6 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard>
          <h3 className="text-base font-semibold text-white mb-4">Workforce Verticals</h3>
          <div className="space-y-2">
            {workforce.slice(0, 6).map((v: any) => (
              <div
                key={v.id}
                className="flex items-center justify-between py-1.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {v.vertical}
                </span>
                <span className="text-sm font-medium text-white">{v.clientCount} clients</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "New Deal", desc: "Create a new pipeline entry" },
              { label: "Add Organization", desc: "Register a new org" },
              { label: "View Reports", desc: "Analytics and insights" },
              { label: "Manage Tasks", desc: "View task queue" },
            ].map((action) => (
              <button
                key={action.label}
                className="text-left p-4 rounded-xl transition-colors"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(233,30,140,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{action.label}</p>
                  <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {action.desc}
                </p>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
