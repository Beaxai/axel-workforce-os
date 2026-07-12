import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Users,
  BarChart3,
  Building2,
  Handshake,
  Shield,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const { data: orgs = [] } = useQuery({ queryKey: ["organizations"], queryFn: () => api.get<any[]>("/organizations") });
  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => api.get<any[]>("/employees") });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => api.get<any[]>("/contacts") });

  const stats = [
    { label: "Organizations", value: orgs.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Deals", value: deals.length, icon: Handshake, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Policies", value: policies.length, icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Employees", value: employees.length, icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Contacts", value: contacts.length, icon: BarChart3, color: "text-pink-600", bg: "bg-pink-50" },
  ];

  const recentDeals = deals.slice(0, 5);

  const stageColors: Record<string, string> = {
    SUBMISSION_REVIEW: "bg-blue-100 text-blue-700",
    INDICATION: "bg-yellow-100 text-yellow-700",
    UW_REVIEW: "bg-purple-100 text-purple-700",
    APPROVED_QUOTED: "bg-purple-100 text-purple-700",
    BIND_ORDER: "bg-yellow-100 text-yellow-700",
    BOUND: "bg-green-100 text-green-700",
    CLIENT: "bg-green-100 text-green-700",
    LOST: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Axel Workforce OS overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Deals</h3>
          {recentDeals.length === 0 ? (
            <p className="text-slate-400 text-sm">No deals yet. Create your first deal to get started.</p>
          ) : (
            <div className="space-y-3">
              {recentDeals.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{d.referenceCode}</p>
                    <p className="text-xs text-slate-500">{d.vertical || "—"} · {d.state || "—"}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${stageColors[d.stage] || "bg-slate-100 text-slate-600"}`}>
                    {d.stage?.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Pipeline Summary</h3>
          {deals.length === 0 ? (
            <p className="text-slate-400 text-sm">No pipeline data available yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                deals.reduce((acc: Record<string, number>, d: any) => {
                  const stage = d.stage || "UNKNOWN";
                  acc[stage] = (acc[stage] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([stage, count]: [string, number]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{stage.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(count / deals.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
