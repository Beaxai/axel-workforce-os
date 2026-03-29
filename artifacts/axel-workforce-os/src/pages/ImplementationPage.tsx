import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function ImplementationPage() {
  const { data: trackers = [], isLoading } = useQuery({ queryKey: ["implementation"], queryFn: () => api.get<any[]>("/implementation") });

  const statusColors: Record<string, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    ON_HOLD: "bg-yellow-100 text-yellow-700",
    BLOCKED: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Implementation Trackers</h1>
        <p className="text-slate-500 mt-1">{trackers.length} active implementations</p>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading...</p>
      ) : trackers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-slate-400">No implementation trackers yet. They are created when a deal moves to the implementation phase.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trackers.map((t: any) => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900">{t.productType}</p>
                  <p className="text-sm text-slate-500">Go-live: {t.goLiveDate}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[t.status] || "bg-slate-100"}`}>{t.status?.replace(/_/g, " ")}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${t.overallProgress || 0}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{t.overallProgress || 0}% complete</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
