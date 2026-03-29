import { useState, useEffect } from "react";
import {
  Users,
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  Building2,
  Shield,
  Zap,
} from "lucide-react";

const stats = [
  { label: "Total Employees", value: "2,847", icon: Users, change: "+12%" },
  { label: "Departments", value: "24", icon: Building2, change: "+2" },
  { label: "Active Projects", value: "156", icon: BarChart3, change: "+8%" },
  { label: "Avg. Attendance", value: "96.4%", icon: Clock, change: "+1.2%" },
];

const modules = [
  { name: "Employee Management", desc: "Track and manage your entire workforce", icon: Users, color: "bg-blue-500" },
  { name: "Time & Attendance", desc: "Automated time tracking and scheduling", icon: Clock, color: "bg-green-500" },
  { name: "Performance", desc: "Reviews, goals, and development plans", icon: TrendingUp, color: "bg-purple-500" },
  { name: "Analytics", desc: "Workforce insights and reporting", icon: BarChart3, color: "bg-orange-500" },
  { name: "Scheduling", desc: "Shift planning and calendar management", icon: Calendar, color: "bg-pink-500" },
  { name: "Compliance", desc: "Regulatory compliance and documentation", icon: Shield, color: "bg-red-500" },
];

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch("/api/healthz")
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status || "connected"))
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Axel Workforce OS
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  apiStatus === "ok" || apiStatus === "connected"
                    ? "bg-green-100 text-green-700"
                    : apiStatus === "checking..."
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    apiStatus === "ok" || apiStatus === "connected"
                      ? "bg-green-500"
                      : apiStatus === "checking..."
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                />
                API: {apiStatus}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">
            Welcome to your workforce management platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Modules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <div
                key={mod.name}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg ${mod.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <mod.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{mod.name}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">{mod.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Tech Stack
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              "React 18 + TypeScript",
              "Vite",
              "Tailwind CSS",
              "Express.js",
              "Supabase",
              "Socket.IO",
              "Zustand",
              "React Query",
            ].map((tech) => (
              <div
                key={tech}
                className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 text-center font-medium"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
