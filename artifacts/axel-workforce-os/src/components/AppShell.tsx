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
  const sidebarBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)";
  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.45)";
  const textSecondary = isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.55)";
  const hoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const glassBg = isDark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.03)";
  const dropdownBg = isDark ? "rgba(20,20,24,0.98)" : "rgba(255,255,255,0.98)";

  const isActive = (item: NavItem) =>
    location.pathname === item.path ||
    (item.path !== `/dashboard/${user.role.toLowerCase()}` &&
      location.pathname.startsWith(item.path));

  return (
    <div style={{ display: "flex", height: "100vh", background: bg, overflow: "hidden" }}>
      <aside
        style={{
          width: collapsed ? "64px" : "280px",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          transition: "width 0.2s",
          background: sidebarBg,
          borderRight: `1px solid ${borderColor}`,
        }}
      >
        {/* Brand row */}
        <div
          style={{
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? "0" : "0 16px",
            flexShrink: 0,
          }}
        >
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="axel-sidebar-control"
              style={{
                width: "32px",
                height: "32px",
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL || "/"}images/axel-icon-color.png`}
                alt="Axel"
                style={{
                  height: "28px",
                  width: "28px",
                  objectFit: "contain",
                }}
              />
            </button>
          ) : (
            <>
              <img
                src={`${import.meta.env.BASE_URL || "/"}images/${isDark ? "axel-logo" : "axel-logo-dark"}.png`}
                alt="Axel Workforce OS"
                style={{
                  height: isDark ? "28px" : "36px",
                  width: "auto",
                  objectFit: "contain",
                  filter: isDark ? "brightness(0) invert(1)" : "none",
                }}
              />
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="axel-sidebar-control"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  border: `1px solid ${borderColor}`,
                  background: "transparent",
                  color: textMuted,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Collapse sidebar"
              >
                <ChevronLeft style={{ width: "14px", height: "14px" }} />
              </button>
            </>
          )}
        </div>

        {/* Workspace switcher pill */}
        {!collapsed && (
          <div style={{ position: "relative", padding: "0 12px 12px 12px" }}>
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              aria-label="Switch workspace / role"
              aria-expanded={roleSwitcherOpen}
              className="axel-sidebar-control"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px 8px 8px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 500,
                background: glassBg,
                border: `1px solid ${borderColor}`,
                color: textPrimary,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = glassBg)}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  flexShrink: 0,
                }}
              >
                A
              </div>
              <span
                style={{
                  flex: 1,
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {ROLE_LABELS[user.role]}
              </span>
              <ChevronDown
                style={{
                  width: "14px",
                  height: "14px",
                  color: textMuted,
                  flexShrink: 0,
                }}
              />
            </button>

            {roleSwitcherOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "12px",
                  right: "12px",
                  marginTop: "4px",
                  borderRadius: "10px",
                  padding: "4px",
                  zIndex: 50,
                  background: dropdownBg,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                }}
              >
                {ALL_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleSwitchRole(role)}
                    className="axel-sidebar-control"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      fontSize: "12px",
                      fontWeight: 500,
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: role === user.role ? (role === "ADMIN" ? "#7C3AED" : "#E91E8C") : textSecondary,
                      background:
                        role === user.role
                          ? role === "ADMIN"
                            ? "rgba(124,58,237,0.10)"
                            : "rgba(233,30,140,0.10)"
                          : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (role !== user.role) e.currentTarget.style.background = hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      if (role !== user.role) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            padding: collapsed ? "8px" : "0 12px 12px 12px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item);
            const locked = item.locked;
            const isAdmin = user.role === "ADMIN";
            const accent = isAdmin ? "#7C3AED" : "#E91E8C";
            const accentRgb = isAdmin ? "124,58,237" : "233,30,140";
            const edgeGradient = isAdmin
              ? "linear-gradient(180deg, #7C3AED 0%, #1E1147 100%)"
              : "linear-gradient(180deg, #E91E8C 0%, #2D1A5C 100%)";
            const glowGradient = `linear-gradient(270deg, rgba(${accentRgb},0.45) 0%, rgba(${accentRgb},0) 55%)`;
            const activePillBg = isDark ? "#15151c" : "rgba(0,0,0,0.04)";
            const activeBoxShadow = isDark
              ? "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.4), 0 6px 16px -8px rgba(0,0,0,0.5)"
              : "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.08), 0 6px 16px -8px rgba(0,0,0,0.18)";
            return (
              <Link
                key={item.path}
                to={locked ? "#" : item.path}
                onClick={(e) => locked && e.preventDefault()}
                aria-current={active ? "page" : undefined}
                className="axel-sidebar-control"
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: collapsed ? "10px" : "10px 14px",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "background 0.15s, box-shadow 0.15s",
                  background: active ? activePillBg : "transparent",
                  color: locked
                    ? textMuted
                    : active
                      ? isDark
                        ? "#fff"
                        : "#111"
                      : textSecondary,
                  border: "1px solid transparent",
                  boxShadow: active ? activeBoxShadow : "none",
                  overflow: "hidden",
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
                {/* Active state: glow + right-edge accent bar */}
                {active && !collapsed && (
                  <>
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: glowGradient,
                        pointerEvents: "none",
                        zIndex: 0,
                      }}
                    />
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        right: 0,
                        width: "3px",
                        background: edgeGradient,
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                    />
                  </>
                )}
                {locked ? (
                  <Lock
                    style={{
                      width: "18px",
                      height: "18px",
                      flexShrink: 0,
                      color: textMuted,
                      strokeWidth: 1.75,
                      position: "relative",
                      zIndex: 2,
                    }}
                  />
                ) : (
                  <item.icon
                    style={{
                      width: "18px",
                      height: "18px",
                      flexShrink: 0,
                      color: active ? (isDark ? "#fff" : accent) : textMuted,
                      strokeWidth: 1.75,
                      position: "relative",
                      zIndex: 2,
                    }}
                  />
                )}
                {!collapsed && (
                  <span style={{ position: "relative", zIndex: 2 }}>{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer — Sign Out only */}
        <div style={{ padding: "12px", borderTop: `1px solid ${borderColor}` }}>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="axel-sidebar-control"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: collapsed ? "10px" : "10px 14px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 500,
              width: "100%",
              border: "1px solid transparent",
              background: "transparent",
              color: textMuted,
              cursor: "pointer",
              transition: "background 0.15s",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut style={{ width: "18px", height: "18px", strokeWidth: 1.75 }} />
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
          >Workforce OS</span>

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

        <main style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
            <Outlet />
          </div>
        </main>
      </div>
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
