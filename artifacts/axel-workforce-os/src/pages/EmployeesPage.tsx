import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Search } from "lucide-react";

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const { data: employees = [], isLoading } = useQuery({ queryKey: ["employees"], queryFn: () => api.get<any[]>("/employees") });

  const create = useMutation({
    mutationFn: (body: any) => api.post("/employees", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); setShowForm(false); },
  });

  const filtered = employees.filter((e: any) =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500 mt-1">{employees.length} employees</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">New Employee</h3>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); create.mutate({ firstName: fd.get("firstName"), lastName: fd.get("lastName"), email: fd.get("email") || null, jobTitle: fd.get("jobTitle") || null, department: fd.get("department") || null, state: fd.get("state") || null, status: "ACTIVE" }); }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">First Name</label><input name="firstName" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label><input name="lastName" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input name="email" type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label><input name="jobTitle" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Department</label><input name="department" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">State</label><input name="state" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={create.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">{create.isPending ? "Creating..." : "Create"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Title</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Department</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">State</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No employees found</td></tr>
            ) : filtered.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{e.firstName} {e.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{e.email || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{e.jobTitle || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{e.department || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{e.state || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${e.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{e.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
