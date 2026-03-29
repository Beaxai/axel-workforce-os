import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Shield } from "lucide-react";

export default function PoliciesPage() {
  const { data: policies = [], isLoading } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });

  const statusColors: Record<string, string> = {
    BOUND: "bg-green-100 text-green-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    EXPIRED: "bg-red-100 text-red-700",
    CANCELLED: "bg-slate-100 text-slate-600",
  };

  const fmt = (v: string | null) => v ? Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—";

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Policies</h1>
          <p className="text-slate-500 mt-1">{policies.length} policies</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Policy #</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Effective</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Expiration</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Premium</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : policies.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No policies yet</td></tr>
            ) : policies.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{p.policyNumber || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{p.policyType || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[p.status] || "bg-slate-100"}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.effectiveDate || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{p.expirationDate || "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(p.currentPremium)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
