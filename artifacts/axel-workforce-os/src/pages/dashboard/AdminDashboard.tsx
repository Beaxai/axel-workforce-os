import { useState } from "react";
import {
  CreditCard,
  TrendingUp,
  Users,
  Shield,
  HeartPulse,
  HardHat,
  Leaf,
  Briefcase,
  UtensilsCrossed,
  MoreHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useThemeColors } from "@/lib/use-theme-colors";

const KPI_DATA = [
  { label: "TOTAL PREMIUM IN FORCE", value: "$142.8M", delta: "+12.4%", icon: CreditCard },
  { label: "TOTAL WORKFORCE REVENUE", value: "$28.4M", delta: "+8.2%", icon: TrendingUp },
  { label: "TOTAL WORKFORCE HEADCOUNT", value: "12,482", valueSuffix: "Active", delta: null, icon: Users },
  { label: "AGENTS APPOINTED", value: "3,105", delta: "+240", icon: Shield },
];

const DONUT_DATA = [
  { name: "Healthcare", value: 1420 },
  { name: "Construction", value: 1014 },
  { name: "Cannabis", value: 608 },
  { name: "Staffing", value: 486 },
  { name: "Hospitality", value: 324 },
];

const DONUT_COLORS = ["#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95", "rgba(124,58,237,0.4)"];

const SECTOR_DATA = [
  { icon: HeartPulse, name: "Healthcare", subtitle: "Critical Care & Pharma", count: "1,420", delta: "+4.1%", deltaType: "positive" as const },
  { icon: HardHat, name: "Construction", subtitle: "Infrastructure & Residential", count: "1,014", delta: "+2.8%", deltaType: "positive" as const },
  { icon: Leaf, name: "Cannabis", subtitle: "Retail & Cultivation", count: "608", delta: "-1.4%", deltaType: "negative" as const },
  { icon: Briefcase, name: "Staffing", subtitle: "Clerical & Industrial", count: "486", delta: "STEADY", deltaType: "steady" as const },
  { icon: UtensilsCrossed, name: "Hospitality", subtitle: "F&B and Lodging", count: "324", delta: "STEADY", deltaType: "steady" as const },
];

const PIPELINE_DATA = [
  { initials: "TP", name: "Titan Pacific Contractors", vertical: "Construction", status: "IN REVIEW", revenue: "$450,000", color: "#1E40AF" },
  { initials: "EC", name: "Emerald Coast Cultivation", vertical: "Cannabis", status: "ACTIVE", revenue: "$1,200,000", color: "#065F46" },
  { initials: "PH", name: "Pinnacle Home Health", vertical: "Healthcare", status: "PENDING", revenue: "$890,000", color: "#7C3AED" },
];

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  "IN REVIEW": { color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  ACTIVE: { color: "#10B981", bg: "rgba(16,185,129,0.15)" },
  PENDING: { color: "#F97316", bg: "rgba(249,115,22,0.15)" },
};

export default function AdminDashboard() {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor, hoverBg } = useThemeColors();

  const DELTA_COLORS = { positive: "#10B981", negative: "#EF4444", steady: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)" };

  function GlassPanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
      <div style={{
        background: cardBg,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: 24,
        ...style,
      }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: textMuted, margin: 0 }}>
            Real-time performance analytics across the global ecosystem.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button style={{
            background: "transparent", border: `1px solid ${borderColor}`, borderRadius: 8,
            color: textSecondary, fontSize: 13, fontWeight: 500, padding: "8px 16px", cursor: "pointer",
          }}>Export Report</button>
          <button style={{
            background: "#7C3AED", border: "none", borderRadius: 8,
            color: "#fff", fontSize: 13, fontWeight: 500, padding: "8px 16px", cursor: "pointer",
          }}>+ Generate Insight</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {KPI_DATA.map((kpi) => (
          <GlassPanel key={kpi.label} style={{ borderBottom: "2px solid #7C3AED" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: textMuted, fontFamily: "var(--app-font-heading)" }}>
                {kpi.label}
              </span>
              <div style={{ background: "rgba(124,58,237,0.2)", borderRadius: 8, padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <kpi.icon style={{ width: 16, height: 16, color: "#7C3AED" }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: textPrimary }}>{kpi.value}</span>
              {"valueSuffix" in kpi && kpi.valueSuffix && (
                <span style={{ fontSize: 13, color: textMuted }}>{kpi.valueSuffix}</span>
              )}
              {kpi.delta && (
                <span style={{ fontSize: 12, fontWeight: 500, color: "#4ADE80" }}>{kpi.delta}</span>
              )}
            </div>
          </GlassPanel>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "45fr 55fr", gap: 16, marginBottom: 24 }}>
        <GlassPanel>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, margin: 0, marginBottom: 4 }}>
              Policies by Vertical Distribution
            </h2>
            <p style={{ fontSize: 12, color: textMuted, margin: 0, lineHeight: 1.4 }}>
              Comprehensive breakdown of active policy accounts across primary market sectors.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ position: "relative", width: 240, height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={DONUT_DATA} cx="50%" cy="50%" innerRadius={75} outerRadius={110} dataKey="value" stroke="none">
                    {DONUT_DATA.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: textPrimary }}>4.2k</div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: textMuted, fontFamily: "var(--app-font-heading)" }}>
                  TOTAL POLICIES
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: "flex", gap: 16,
            background: cardBg, backdropFilter: "blur(12px)",
            border: `1px solid ${borderColor}`, borderRadius: 10, padding: 16,
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: textMuted, display: "block", marginBottom: 4, fontFamily: "var(--app-font-heading)" }}>
                PRIMARY GROWTH
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>Healthcare</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#10B981" }}>+12%</span>
              </div>
            </div>
            <div style={{ width: 1, background: borderColor }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: textMuted, display: "block", marginBottom: 4, fontFamily: "var(--app-font-heading)" }}>
                AVG. RETENTION
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>94.8%</span>
                <span style={{ fontSize: 13, color: textMuted }}>Stable</span>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: textMuted, fontFamily: "var(--app-font-heading)" }}>
              SECTOR PERFORMANCE DETAIL
            </span>
            <span style={{ fontSize: 12, color: "#7C3AED", cursor: "pointer", fontWeight: 500 }}>
              Quarterly View
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {SECTOR_DATA.map((sector, i) => (
              <div
                key={sector.name}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 0",
                  borderBottom: i < SECTOR_DATA.length - 1 ? `1px solid ${borderColor}` : "none",
                }}
              >
                <div style={{
                  background: "rgba(124,58,237,0.15)", borderRadius: 8, padding: 8,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <sector.icon style={{ width: 18, height: 18, color: "#7C3AED" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{sector.name}</div>
                  <div style={{ fontSize: 11, color: textMuted }}>{sector.subtitle}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>{sector.count}</div>
                  <div style={{ fontSize: 12, color: DELTA_COLORS[sector.deltaType] }}>{sector.delta}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>Recent Implementation Pipelines</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7C3AED", cursor: "pointer", fontFamily: "var(--app-font-heading)" }}>
            VIEW ALL PIPELINES
          </span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["ACCOUNT NAME", "VERTICAL", "STATUS", "ESTIMATED REVENUE", "ACTIONS"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                  color: textMuted, padding: "0 8px 12px", fontFamily: "var(--app-font-heading)",
                  borderBottom: `1px solid ${borderColor}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PIPELINE_DATA.map((row) => {
              const st = STATUS_STYLES[row.status] || { color: textPrimary, bg: cardBg };
              return (
                <tr
                  key={row.initials}
                  style={{ borderBottom: `1px solid ${borderColor}`, transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 999, background: row.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 11, fontWeight: 600, flexShrink: 0,
                      }}>{row.initials}</div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: textPrimary }}>{row.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 8px", fontSize: 13, color: textSecondary }}>{row.vertical}</td>
                  <td style={{ padding: "14px 8px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 4, padding: "2px 8px" }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 8px", fontSize: 14, fontWeight: 500, color: textPrimary }}>{row.revenue}</td>
                  <td style={{ padding: "14px 8px", position: "relative" }}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === row.initials ? null : row.initials)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 4 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = textPrimary)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = textMuted)}
                    >
                      <MoreHorizontal style={{ width: 18, height: 18 }} />
                    </button>
                    {menuOpen === row.initials && (
                      <div style={{
                        position: "absolute", right: 8, top: 40, background: isDark ? "#1a1a2e" : "#fff",
                        border: `1px solid ${borderColor}`, borderRadius: 8, padding: "4px 0", minWidth: 120, zIndex: 10,
                        boxShadow: isDark ? "none" : "0 4px 12px rgba(0,0,0,0.1)",
                      }}>
                        {["Edit", "View", "Archive"].map((action) => (
                          <button
                            key={action}
                            onClick={() => setMenuOpen(null)}
                            style={{
                              display: "block", width: "100%", textAlign: "left", background: "none",
                              border: "none", color: textSecondary, fontSize: 13, padding: "8px 14px", cursor: "pointer",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >{action}</button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}
