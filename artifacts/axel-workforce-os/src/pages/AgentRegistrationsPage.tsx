import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function AgentRegistrationsPage() {
  const { data: regs = [], isLoading } = useQuery({ queryKey: ["agent-registrations"], queryFn: () => api.get<any[]>("/agent-registrations") });

  const statusColors: Record<string, string> = {
    PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    DECLINED: "bg-red-100 text-red-700",
    ACTIVE: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Agent Registrations</h1>
        <p className="text-slate-500 mt-1">{regs.length} registrations</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Agency</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : regs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No registrations yet</td></tr>
            ) : regs.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.agencyName}</td>
                <td className="px-4 py-3 text-slate-600">{r.firstName} {r.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{r.email}</td>
                <td className="px-4 py-3 text-slate-600">{r.phone}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[r.status] || "bg-slate-100"}`}>{r.status?.replace(/_/g, " ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
