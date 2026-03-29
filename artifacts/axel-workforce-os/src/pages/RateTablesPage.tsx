import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search } from "lucide-react";

export default function RateTablesPage() {
  const [search, setSearch] = useState("");
  const { data: rates = [], isLoading } = useQuery({ queryKey: ["rate-tables"], queryFn: () => api.get<any[]>("/rate-tables") });

  const filtered = rates.filter((r: any) =>
    r.classDescription?.toLowerCase().includes(search.toLowerCase()) ||
    r.classCode?.toLowerCase().includes(search.toLowerCase()) ||
    r.state?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Rate Tables</h1>
        <p className="text-slate-500 mt-1">{rates.length} rates loaded</p>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by class code, description, or state..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Class Code</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">State</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Carrier</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Base Rate</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Effective</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No rates found</td></tr>
            ) : filtered.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{r.classCode}</td>
                <td className="px-4 py-3 text-slate-600">{r.classDescription}</td>
                <td className="px-4 py-3 text-slate-600">{r.state}</td>
                <td className="px-4 py-3 text-slate-600">{r.carrier}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-900">{Number(r.baseRate).toFixed(4)}</td>
                <td className="px-4 py-3 text-slate-600">{r.effectiveDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
