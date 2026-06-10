import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuthStore, ROLE_LABELS, ROLE_PATHS, type PartyRole } from "@/lib/auth-store";
import { ROLE_NAV } from "@/lib/role-config";
import { useThemeColors } from "@/lib/use-theme-colors";

const ALL_ROLES: PartyRole[] = [
  "ADMIN", "UNDERWRITER", "CSA", "AGENT",
  "EMPLOYER", "CARRIER", "PEO", "VENDOR",
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, switchRole } = useAuthStore();
  const { isDark, bg, textPrimary, textMuted, textSecondary, borderColor, hoverBg, cardBg, dropdownBg } = useThemeColors();
  const [collapsed, setCollapsed] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  if (!user) return null;

  const navItems = ROLE_NAV[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSwitchRole = (role: PartyRole) => {
    switchRole(role);
    setRoleSwitcherOpen(false);
    navigate(ROLE_PATHS[role]);
  };

  return (
    <div className="min-h-screen flex" style={{ background: bg }}>
      <aside
        className={`${collapsed ? "w-16" : "w-60"} flex flex-col shrink-0 transition-all duration-200`}
        style={{
          background: cardBg,
          borderRight: `1px solid ${borderColor}`,
        }}
      >
        <div
          className="h-14 flex items-center justify-between px-3"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--accent-primary)" }}
              >
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight" style={{ color: textPrimary }}>Axel WOS</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path !== `/dashboard/${user.role.toLowerCase()}` &&
                location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? "var(--accent-primary-soft)" : "transparent",
                  color: active ? "var(--accent-primary)" : textSecondary,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: active ? "var(--accent-primary)" : textMuted }}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          className="p-3"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          {!collapsed && (
            <div className="relative mb-2">
              <button
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  color: textSecondary,
                }}
              >
                <span>{ROLE_LABELS[user.role]}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {roleSwitcherOpen && (
                <div
                  className="absolute bottom-full left-0 w-full mb-1 rounded-lg py-1 z-50"
                  style={{
                    background: dropdownBg,
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {ALL_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => handleSwitchRole(role)}
                      className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                      style={{
                        color:
                          role === user.role ? "var(--accent-primary)" : textSecondary,
                        background: role === user.role ? "var(--accent-primary-soft)" : "transparent",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          role === user.role
                            ? "var(--accent-primary-soft)"
                            : hoverBg)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          role === user.role ? "var(--accent-primary-soft)" : "transparent")
                      }
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full"
            style={{ color: textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div
          className="h-14 flex items-center px-6"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--accent-primary-soft)", color: "var(--accent-primary)" }}
            >
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: textPrimary }}>
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs" style={{ color: textMuted }}>
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
