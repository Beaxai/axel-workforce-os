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

// TODO: replace with Supabase query
const KPI_DATA = [
  { label: "TOTAL PREMIUM IN FORCE", value: "$142.8M", delta: "+12.4%", icon: CreditCard },
  { label: "TOTAL WORKFORCE REVENUE", value: "$28.4M", delta: "+8.2%", icon: TrendingUp },
  { label: "TOTAL WORKFORCE HEADCOUNT", value: "12,482", valueSuffix: "Active", delta: null, icon: Users },
  { label: "AGENTS APPOINTED", value: "3,105", delta: "+240", icon: Shield },
];

// TODO: replace with Supabase query
const DONUT_DATA = [
  { name: "Healthcare", value: 1420 },
  { name: "Construction", value: 1014 },
  { name: "Cannabis", value: 608 },
  { name: "Staffing", value: 486 },
  { name: "Hospitality", value: 324 },
];

const DONUT_COLORS = ["#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95", "rgba(124,58,237,0.4)"];

// TODO: replace with Supabase query
const SECTOR_DATA = [
  { icon: HeartPulse, name: "Healthcare", subtitle: "Critical Care & Pharma", count: "1,420", delta: "+4.1%", deltaType: "positive" as const },
  { icon: HardHat, name: "Construction", subtitle: "Infrastructure & Residential", count: "1,014", delta: "+2.8%", deltaType: "positive" as const },
  { icon: Leaf, name: "Cannabis", subtitle: "Retail & Cultivation", count: "608", delta: "-1.4%", deltaType: "negative" as const },
  { icon: Briefcase, name: "Staffing", subtitle: "Clerical & Industrial", count: "486", delta: "STEADY", deltaType: "steady" as const },
  { icon: UtensilsCrossed, name: "Hospitality", subtitle: "F&B and Lodging", count: "324", delta: "STEADY", deltaType: "steady" as const },
];

// TODO: replace with Supabase query
const PIPELINE_DATA = [
  { initials: "BC", name: "BuildCo Solutions", vertical: "Construction", status: "IN REVIEW", revenue: "$450,000", color: "#1E40AF" },
  { initials: "GL", name: "Green Leaf Logistics", vertical: "Cannabis", status: "ACTIVE", revenue: "$1,200,000", color: "#065F46" },
  { initials: "HN", name: "Horizon Nursing", vertical: "Healthcare", status: "PENDING", revenue: "$890,000", color: "#7C3AED" },
];

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  "IN REVIEW": { color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  ACTIVE: { color: "#10B981", bg: "rgba(16,185,129,0.15)" },
  PENDING: { color: "#F97316", bg: "rgba(249,115,22,0.15)" },
};

const DELTA_COLORS = { positive: "#10B981", negative: "#EF4444", steady: "rgba(255,255,255,0.4)" };

function GlassPanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            Real-time performance analytics across the global ecosystem.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
            color: "#fff", fontSize: 13, fontWeight: 500, padding: "8px 16px", cursor: "pointer",
          }}>Export Report</button>
          <button style={{
            background: "#7C3AED", border: "none", borderRadius: 8,
            color: "#fff", fontSize: 13, fontWeight: 500, padding: "8px 16px", cursor: "pointer",
          }}>+ Generate Insight</button>
        </div>
      </div>

      {/* ROW 1 — KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {KPI_DATA.map((kpi) => (
          <GlassPanel key={kpi.label} style={{ borderBottom: "2px solid #7C3AED" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                {kpi.label}
              </span>
              <div style={{ background: "rgba(124,58,237,0.2)", borderRadius: 8, padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <kpi.icon style={{ width: 16, height: 16, color: "#7C3AED" }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{kpi.value}</span>
              {"valueSuffix" in kpi && kpi.valueSuffix && (
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{kpi.valueSuffix}</span>
              )}
              {kpi.delta && (
                <span style={{ fontSize: 12, fontWeight: 500, color: "#4ADE80" }}>{kpi.delta}</span>
              )}
            </div>
          </GlassPanel>
        ))}
      </div>

      {/* ROW 2 — TWO COLUMN: Donut + Sector Detail */}
      <div style={{ display: "grid", gridTemplateColumns: "45fr 55fr", gap: 16, marginBottom: 24 }}>
        {/* Left: Policies by Vertical Distribution */}
        <GlassPanel>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, marginBottom: 4 }}>
              Policies by Vertical Distribution
            </h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.4 }}>
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
                <div style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>4.2k</div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
                  TOTAL POLICIES
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: "flex", gap: 16,
            background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16,
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>
                PRIMARY GROWTH
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Healthcare</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#10B981" }}>+12%</span>
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>
                AVG. RETENTION
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>94.8%</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Stable</span>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Right: Sector Performance Detail */}
        <GlassPanel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
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
                  borderBottom: i < SECTOR_DATA.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <div style={{
                  background: "rgba(124,58,237,0.15)", borderRadius: 8, padding: 8,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <sector.icon style={{ width: 18, height: 18, color: "#7C3AED" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{sector.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{sector.subtitle}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{sector.count}</div>
                  <div style={{ fontSize: 12, color: DELTA_COLORS[sector.deltaType] }}>{sector.delta}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* ROW 3 — RECENT IMPLEMENTATION PIPELINES */}
      <GlassPanel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Recent Implementation Pipelines</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7C3AED", cursor: "pointer" }}>
            VIEW ALL PIPELINES
          </span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["ACCOUNT NAME", "VERTICAL", "STATUS", "ESTIMATED REVENUE", "ACTIONS"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
                  color: "rgba(255,255,255,0.4)", padding: "0 8px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PIPELINE_DATA.map((row) => {
              const st = STATUS_STYLES[row.status] || { color: "#fff", bg: "rgba(255,255,255,0.1)" };
              return (
                <tr
                  key={row.initials}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 999, background: row.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 11, fontWeight: 600, flexShrink: 0,
                      }}>{row.initials}</div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{row.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 8px", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{row.vertical}</td>
                  <td style={{ padding: "14px 8px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 4, padding: "2px 8px" }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 8px", fontSize: 14, fontWeight: 500, color: "#fff" }}>{row.revenue}</td>
                  <td style={{ padding: "14px 8px", position: "relative" }}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === row.initials ? null : row.initials)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                    >
                      <MoreHorizontal style={{ width: 18, height: 18 }} />
                    </button>
                    {menuOpen === row.initials && (
                      <div style={{
                        position: "absolute", right: 8, top: 40, background: "#1a1a2e",
                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "4px 0", minWidth: 120, zIndex: 10,
                      }}>
                        {["Edit", "View", "Archive"].map((action) => (
                          <button
                            key={action}
                            onClick={() => setMenuOpen(null)}
                            style={{
                              display: "block", width: "100%", textAlign: "left", background: "none",
                              border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, padding: "8px 14px", cursor: "pointer",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
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
