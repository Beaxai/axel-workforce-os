import { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Handshake,
  FileText,
  Shield,
  DollarSign,
  Contact,
  UserPlus,
  TableProperties,
  Rocket,
  ClipboardList,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Organizations", path: "/organizations", icon: Building2 },
  { label: "Deals / Pipeline", path: "/deals", icon: Handshake },
  { label: "Policies", path: "/policies", icon: Shield },
  { label: "Contacts", path: "/contacts", icon: Contact },
  { label: "Employees", path: "/employees", icon: Users },
  { label: "Tasks", path: "/tasks", icon: ClipboardList },
  { label: "Commissions", path: "/commissions", icon: DollarSign },
  { label: "Agent Registration", path: "/agent-registrations", icon: UserPlus },
  { label: "Rate Tables", path: "/rate-tables", icon: TableProperties },
  { label: "Implementation", path: "/implementation", icon: Rocket },
  { label: "Workforce", path: "/workforce", icon: Briefcase },
];

export default function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/healthz`)
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status || "connected"))
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside
        className={`${collapsed ? "w-16" : "w-60"} bg-white border-r border-slate-200 flex flex-col transition-all duration-200 shrink-0`}
      >
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-200">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E91E8C" }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900 tracking-tight">Axel WOS</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                apiStatus === "ok" || apiStatus === "connected" ? "bg-green-500" : apiStatus === "checking..." ? "bg-yellow-500" : "bg-red-500"
              }`}
            />
            {!collapsed && <span className="text-xs text-slate-500">API: {apiStatus}</span>}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
