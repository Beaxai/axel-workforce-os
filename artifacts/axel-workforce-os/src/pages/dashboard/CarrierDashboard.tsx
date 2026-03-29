import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { Shield, HeartPulse, DollarSign, BarChart3 } from "lucide-react";

export default function CarrierDashboard() {
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: commissions = [] } = useQuery({ queryKey: ["commissions"], queryFn: () => api.get<any[]>("/commissions") });

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Carrier Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Bound business and claims overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Bound Policies" value={policies.length} icon={Shield} />
        <StatCard label="Open Claims" value={0} icon={HeartPulse} />
        <StatCard label="Commission Entries" value={commissions.length} icon={DollarSign} />
        <StatCard label="Loss Ratio" value="—" icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Bound Policies</h3>
          </div>
          {policies.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No bound policies</p>
          ) : (
            <div className="space-y-3">
              {policies.slice(0, 6).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{p.policyNumber}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {p.productType} · Eff: {p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : "—"}
                    </p>
                  </div>
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
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Performance Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Written Premium", value: "$0" },
              { label: "Claims Paid", value: "$0" },
              { label: "Loss Ratio", value: "N/A" },
              { label: "Active Employers", value: "0" },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3 rounded-lg text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-lg font-bold text-white">{item.value}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
