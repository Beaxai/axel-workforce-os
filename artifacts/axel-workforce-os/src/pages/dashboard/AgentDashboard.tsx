import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { Handshake, DollarSign, Users, FileText, ArrowUpRight } from "lucide-react";

export default function AgentDashboard() {
  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: commissions = [] } = useQuery({ queryKey: ["commissions"], queryFn: () => api.get<any[]>("/commissions") });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => api.get<any[]>("/contacts") });

  const activeDeals = deals.filter((d: any) => !["LOST", "BOUND"].includes(d.stage));
  const totalCommissions = commissions.reduce(
    (sum: number, c: any) => sum + parseFloat(c.amount || "0"),
    0
  );

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Agent Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Your deals, clients, and commissions
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Deals" value={activeDeals.length} icon={Handshake} />
        <StatCard label="Total Deals" value={deals.length} icon={FileText} />
        <StatCard label="Clients" value={contacts.length} icon={Users} />
        <StatCard
          label="Commissions"
          value={`$${totalCommissions.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4" style={{ color: "#E91E8C" }} />
              <h3 className="text-base font-semibold text-white">My Deals</h3>
            </div>
          </div>
          {deals.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No deals submitted yet</p>
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
                      {d.vertical} · {d.employeeCount || "—"} EEs
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full border"
                    style={{
                      borderColor: d.stage === "BOUND" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)",
                      color: d.stage === "BOUND" ? "#22c55e" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {d.stage?.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Commission Statements</h3>
          </div>
          {commissions.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No commissions recorded</p>
          ) : (
            <div className="space-y-3">
              {commissions.slice(0, 5).map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">${parseFloat(c.amount || 0).toLocaleString()}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {c.commissionType} · {c.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Submit New Quote", desc: "Start a new deal submission" },
            { label: "View Commissions", desc: "Check your earnings" },
            { label: "Download Resources", desc: "Forms, guides, and templates" },
          ].map((action) => (
            <button
              key={action.label}
              className="text-left p-4 rounded-xl transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(233,30,140,0.3)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{action.label}</p>
                <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{action.desc}</p>
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
