import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  User,
  Settings,
  Lock,
  Search,
} from "lucide-react";
import { useAuthStore, ROLE_LABELS, ROLE_PATHS, type PartyRole } from "@/lib/auth-store";
import { useThemeStore } from "@/lib/theme-store";
import { ROLE_NAV, type NavItem } from "@/lib/role-config";
import GlobalSearch from "@/components/GlobalSearch";

const ALL_ROLES: PartyRole[] = [
  "ADMIN", "UNDERWRITER", "CSA", "AGENT",
  "EMPLOYER", "CARRIER", "PEO", "VENDOR",
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, switchRole } = useAuthStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [collapsed, setCollapsed] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  if (!user) return null;

  const navItems = ROLE_NAV[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSwitchRole = (role: PartyRole) => {
    switchRole(role);
    setRoleSwitcherOpen(false);
    setTimeout(() => navigate(ROLE_PATHS[role]), 0);
  };

  const bg = isDark ? "#060608" : "#f4f4f5";
  const sidebarBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
  const hoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const glassBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const dropdownBg = isDark ? "rgba(20,20,24,0.98)" : "rgba(255,255,255,0.98)";

  const isActive = (item: NavItem) =>
    location.pathname === item.path ||
    (item.path !== `/dashboard/${user.role.toLowerCase()}` &&
      location.pathname.startsWith(item.path));

  return (
    <div style={{ display: "flex", height: "100vh", background: bg, overflow: "hidden" }}>
      <aside
        style={{
          width: collapsed ? "64px" : "240px",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          transition: "width 0.2s",
          background: sidebarBg,
          borderRight: `1px solid ${borderColor}`,
        }}
      >
        <div
          style={{
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            padding: "0 12px",
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          {!collapsed && (
            <img
              src={`${import.meta.env.BASE_URL || "/"}images/axel-logo.png`}
              alt="Axel Workforce OS"
              style={{
                height: "28px",
                width: "auto",
                objectFit: "contain",
                filter: isDark ? "brightness(0) invert(1)" : "none",
              }}
            />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              padding: "6px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: textMuted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {collapsed ? (
              <ChevronRight style={{ width: "16px", height: "16px" }} />
            ) : (
              <ChevronLeft style={{ width: "16px", height: "16px" }} />
            )}
          </button>
        </div>

        <nav
          style={{
            flex: 1,
            padding: "8px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item);
            const locked = item.locked;
            return (
              <Link
                key={item.path}
                to={locked ? "#" : item.path}
                onClick={(e) => locked && e.preventDefault()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: collapsed ? "8px" : "8px 12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "background 0.15s",
                  background: active ? "rgba(233,30,140,0.15)" : "transparent",
                  color: locked ? textMuted : active ? "#E91E8C" : textSecondary,
                  borderLeft: active ? "3px solid #E91E8C" : "3px solid transparent",
                  opacity: locked ? 0.5 : 1,
                  cursor: locked ? "not-allowed" : "pointer",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                onMouseEnter={(e) => {
                  if (!active && !locked) e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!active && !locked) e.currentTarget.style.background = "transparent";
                }}
                title={collapsed ? item.label : undefined}
              >
                {locked ? (
                  <Lock
                    style={{
                      width: "16px",
                      height: "16px",
                      flexShrink: 0,
                      color: textMuted,
                    }}
                  />
                ) : (
                  <item.icon
                    style={{
                      width: "16px",
                      height: "16px",
                      flexShrink: 0,
                      color: active ? "#E91E8C" : textMuted,
                    }}
                  />
                )}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "12px", borderTop: `1px solid ${borderColor}` }}>
          {!collapsed && (
            <div style={{ position: "relative", marginBottom: "8px" }}>
              <button
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: glassBg,
                  border: `1px solid ${borderColor}`,
                  color: textSecondary,
                  cursor: "pointer",
                }}
              >
                <span>{ROLE_LABELS[user.role]}</span>
                <ChevronDown style={{ width: "12px", height: "12px" }} />
              </button>

              {roleSwitcherOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    width: "100%",
                    marginBottom: "4px",
                    borderRadius: "8px",
                    padding: "4px 0",
                    zIndex: 50,
                    background: dropdownBg,
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {ALL_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => handleSwitchRole(role)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 12px",
                        fontSize: "12px",
                        border: "none",
                        cursor: "pointer",
                        color: role === user.role ? "#E91E8C" : textSecondary,
                        background: role === user.role ? "rgba(233,30,140,0.1)" : "transparent",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          role === user.role ? "rgba(233,30,140,0.15)" : hoverBg)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          role === user.role ? "rgba(233,30,140,0.1)" : "transparent")
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
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "14px",
              width: "100%",
              border: "none",
              background: "transparent",
              color: textMuted,
              cursor: "pointer",
              transition: "background 0.15s",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut style={{ width: "16px", height: "16px" }} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header
          style={{
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            borderBottom: `1px solid ${borderColor}`,
            background: glassBg,
            backdropFilter: "blur(12px)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: textPrimary,
              letterSpacing: "-0.01em",
            }}
          >
            Axel Workforce OS
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title="Search"
            >
              <Search style={{ width: "18px", height: "18px" }} />
            </button>

            <button
              onClick={toggleTheme}
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun style={{ width: "18px", height: "18px" }} />
              ) : (
                <Moon style={{ width: "18px", height: "18px" }} />
              )}
            </button>

            <div style={{ position: "relative" }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: "rgba(233,30,140,0.2)",
                    color: "#E91E8C",
                  }}
                >
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div style={{ textAlign: "left" }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: textPrimary,
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {user.firstName} {user.lastName}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: textMuted,
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
                <ChevronDown style={{ width: "12px", height: "12px", color: textMuted }} />
              </button>

              {userMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "4px",
                    borderRadius: "10px",
                    padding: "4px",
                    zIndex: 50,
                    minWidth: "160px",
                    background: dropdownBg,
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {[
                    { label: "Profile", icon: User },
                    { label: "Settings", icon: Settings },
                  ].map((item) => (
                    <button
                      key={item.label}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        fontSize: "13px",
                        border: "none",
                        borderRadius: "6px",
                        background: "transparent",
                        color: textSecondary,
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <item.icon style={{ width: "14px", height: "14px" }} />
                      {item.label}
                    </button>
                  ))}
                  <div
                    style={{
                      height: "1px",
                      background: borderColor,
                      margin: "4px 0",
                    }}
                  />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      fontSize: "13px",
                      border: "none",
                      borderRadius: "6px",
                      background: "transparent",
                      color: textSecondary,
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <LogOut style={{ width: "14px", height: "14px" }} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: "auto", padding: "24px" }}>
          <Outlet />
        </main>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
