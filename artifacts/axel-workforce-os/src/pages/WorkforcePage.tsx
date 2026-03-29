import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function WorkforcePage() {
  const { data: summaries = [], isLoading: loadingSummaries } = useQuery({ queryKey: ["workforce-summaries"], queryFn: () => api.get<any[]>("/workforce/summaries") });
  const { data: verticals = [], isLoading: loadingVerticals } = useQuery({ queryKey: ["workforce-verticals"], queryFn: () => api.get<any[]>("/workforce/verticals") });

  const fmt = (v: string | null) => v ? Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—";

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Workforce Management</h1>
        <p className="text-slate-500 mt-1">Workforce summaries and vertical rollups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Organization Summaries</h3>
          {loadingSummaries ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : summaries.length === 0 ? (
            <p className="text-slate-400 text-sm">No workforce data yet</p>
          ) : (
            <div className="space-y-4">
              {summaries.map((s: any) => (
                <div key={s.id} className="border border-slate-100 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500">Employees:</span> <span className="font-medium">{s.totalEmployees}</span></div>
                    <div><span className="text-slate-500">FT/PT:</span> <span className="font-medium">{s.ftEmployees}/{s.ptEmployees}</span></div>
                    <div><span className="text-slate-500">Payroll:</span> <span className="font-medium">{fmt(s.totalAnnualPayroll)}</span></div>
                    <div><span className="text-slate-500">New Hires MTD:</span> <span className="font-medium">{s.newHiresMtd}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Vertical Rollups</h3>
          {loadingVerticals ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : verticals.length === 0 ? (
            <p className="text-slate-400 text-sm">No vertical data yet</p>
          ) : (
            <div className="space-y-3">
              {verticals.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{v.vertical}</p>
                    <p className="text-xs text-slate-500">{v.clientCount} clients, {v.totalEmployees} employees</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{fmt(v.totalPremium)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
