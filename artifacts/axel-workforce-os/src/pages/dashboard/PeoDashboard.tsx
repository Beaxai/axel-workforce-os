import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { Users, Briefcase, Receipt, BarChart3 } from "lucide-react";

export default function PeoDashboard() {
  const { data: workforce = [] } = useQuery({ queryKey: ["workforce-verticals"], queryFn: () => api.get<any[]>("/workforce/verticals") });
  const { data: orgs = [] } = useQuery({ queryKey: ["organizations"], queryFn: () => api.get<any[]>("/organizations") });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => api.get<any[]>("/employees") });

  const totalEmployees = workforce.reduce((sum: number, v: any) => sum + (v.totalEmployees || 0), 0);
  const totalPayroll = workforce.reduce((sum: number, v: any) => sum + parseFloat(v.totalPayroll || "0"), 0);

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">PEO Partner Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          PEO client and workforce overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="PEO Clients" value={orgs.filter((o: any) => o.type === "CLIENT").length} icon={Users} />
        <StatCard label="Total Employees" value={totalEmployees} icon={Briefcase} />
        <StatCard
          label="Total Payroll"
          value={`$${totalPayroll.toLocaleString()}`}
          icon={Receipt}
        />
        <StatCard label="Verticals" value={workforce.length} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Workforce by Vertical</h3>
          </div>
          {workforce.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No workforce data</p>
          ) : (
            <div className="space-y-3">
              {workforce.map((v: any) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{v.vertical}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {v.clientCount} clients · {v.totalEmployees} employees
                    </p>
                  </div>
                  <span className="text-sm font-mono text-white">
                    ${parseFloat(v.totalPayroll || "0").toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Client Organizations</h3>
          </div>
          {orgs.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No organizations</p>
          ) : (
            <div className="space-y-3">
              {orgs.slice(0, 6).map((o: any) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{o.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {o.vertical || "—"} · {o.type}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      background: o.status === "ACTIVE" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                      color: o.status === "ACTIVE" ? "#22c55e" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {o.status}
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
