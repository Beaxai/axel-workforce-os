import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function CommissionsPage() {
  const { data: commissions = [], isLoading } = useQuery({ queryKey: ["commissions"], queryFn: () => api.get<any[]>("/commissions") });

  const fmt = (v: string | null) => v ? Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }) : "—";

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
        <p className="text-slate-500 mt-1">{commissions.length} commission records</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Statement Period</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Gross Premium</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Producer Amount</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Net to AIS</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : commissions.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No commissions yet</td></tr>
            ) : commissions.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{c.statementPeriod || "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(c.grossPremium)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(c.producerAmount)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(c.netToAis)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
