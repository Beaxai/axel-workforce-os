import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { Shield, HeartPulse, Receipt, FileText, Rocket, Users } from "lucide-react";

export default function EmployerDashboard() {
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => api.get<any[]>("/employees") });

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Employer Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Your account overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Policies" value={policies.length} icon={Shield} />
        <StatCard label="Employees" value={employees.length} icon={Users} />
        <StatCard label="Open Claims" value={0} icon={HeartPulse} />
        <StatCard label="Documents" value={0} icon={FileText} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">My Policies</h3>
          </div>
          {policies.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No active policies</p>
          ) : (
            <div className="space-y-3">
              {policies.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{p.policyNumber}</p>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: p.status === "ACTIVE" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                        color: p.status === "ACTIVE" ? "#22c55e" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {p.productType} · Eff: {p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="space-y-6">
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4" style={{ color: "#E91E8C" }} />
              <h3 className="text-base font-semibold text-white">Payroll / Billing</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-3 rounded-lg text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-lg font-bold text-white">{employees.length}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Active Employees</p>
              </div>
              <div
                className="p-3 rounded-lg text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-lg font-bold text-white">$0</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Current Invoice</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Rocket className="w-4 h-4" style={{ color: "#E91E8C" }} />
              <h3 className="text-base font-semibold text-white">PEO Onboarding</h3>
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div className="h-full rounded-full w-0" style={{ background: "#E91E8C" }} />
            </div>
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              No onboarding in progress
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
