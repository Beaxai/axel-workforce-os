import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Search, Filter } from "lucide-react";
import { PIPELINE_STAGES, stageLabel, type PipelineStageKey } from "@workspace/pipeline";

export default function DealsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const { data: deals = [], isLoading } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });

  const create = useMutation({
    mutationFn: (body: any) => api.post("/deals", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deals"] }); setShowForm(false); },
  });

  const filtered = deals.filter((d: any) => {
    const matchesSearch = d.referenceCode?.toLowerCase().includes(search.toLowerCase()) || d.vertical?.toLowerCase().includes(search.toLowerCase());
    const matchesStage = !stageFilter || d.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const fmt = (v: string | null) => v ? Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—";

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deals / Pipeline</h1>
          <p className="text-slate-500 mt-1">{deals.length} deals</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Deal
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">New Deal</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            create.mutate({
              referenceCode: fd.get("referenceCode"),
              stage: "NEW_LEAD",
              productType: fd.get("productType"),
              vertical: fd.get("vertical") || null,
              state: fd.get("state") || null,
              employeeCountFt: fd.get("employeeCountFt") ? Number(fd.get("employeeCountFt")) : null,
              estimatedPremium: fd.get("estimatedPremium") || null,
            });
          }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference Code</label>
                <input name="referenceCode" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. DEAL-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Type</label>
                <select name="productType" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="WC_ONLY">WC Only</option>
                  <option value="PEO">PEO</option>
                  <option value="ASO">ASO</option>
                  <option value="STAFFING">Staffing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vertical</label>
                <input name="vertical" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Construction, Healthcare..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input name="state" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="FL, TX, CA..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">FT Employees</label>
                <input name="employeeCountFt" type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Est. Premium</label>
                <input name="estimatedPremium" type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={create.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {create.isPending ? "Creating..." : "Create Deal"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Stages</option>
          {PIPELINE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Ref Code</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Stage</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Product</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Vertical</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">State</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Est. Premium</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Employees</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No deals found</td></tr>
            ) : filtered.map((d: any) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{d.referenceCode}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    {stageLabel(d.stage as PipelineStageKey) || d.stage}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{d.productType || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{d.vertical || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{d.state || "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(d.estimatedPremium)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{d.employeeCountFt ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
