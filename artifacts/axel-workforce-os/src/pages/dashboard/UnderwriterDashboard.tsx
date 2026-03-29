import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { ListChecks, Handshake, Shield, BarChart3, Clock, AlertTriangle } from "lucide-react";

export default function UnderwriterDashboard() {
  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: rates = [] } = useQuery({ queryKey: ["pepm-rates"], queryFn: () => api.get<any[]>("/rate-tables/pepm") });

  const pendingDeals = deals.filter((d: any) => ["NEW_LEAD", "QUOTING"].includes(d.stage));
  const boundDeals = deals.filter((d: any) => d.stage === "BOUND");

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Underwriter Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Deal review and approval center
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Review" value={pendingDeals.length} icon={Clock} />
        <StatCard label="Total Deals" value={deals.length} icon={Handshake} />
        <StatCard label="Bound Policies" value={policies.length} icon={Shield} />
        <StatCard label="Rate Entries" value={rates.length} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Underwriting Queue</h3>
          </div>
          {pendingDeals.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No deals pending review</p>
          ) : (
            <div className="space-y-3">
              {pendingDeals.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{d.referenceCode}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {d.vertical} · {d.state} · EEs: {d.employeeCount || "—"}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(233,30,140,0.15)", color: "#E91E8C" }}
                  >
                    Review
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: "#E91E8C" }} />
            <h3 className="text-base font-semibold text-white">Rate Table Overview</h3>
          </div>
          {rates.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No rates configured</p>
          ) : (
            <div className="space-y-2">
              {rates.slice(0, 8).map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div>
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {r.vertical}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {r.productType} · {r.employeeBandMin}-{r.employeeBandMax} EEs
                    </span>
                  </div>
                  <span className="text-sm font-mono text-white">${r.pepmRate}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4" style={{ color: "#E91E8C" }} />
          <h3 className="text-base font-semibold text-white">Bound Policies</h3>
        </div>
        {policies.length === 0 ? (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No bound policies yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {policies.slice(0, 4).map((p: any) => (
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
