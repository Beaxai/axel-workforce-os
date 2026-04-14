export function DashboardPreview() {
  const bg = "#060608";
  const cardBg = "rgba(255,255,255,0.05)";
  const glassBg = "rgba(255,255,255,0.035)";
  const borderColor = "rgba(255,255,255,0.07)";
  const textPrimary = "#fff";
  const textSecondary = "rgba(255,255,255,0.72)";
  const textMuted = "rgba(255,255,255,0.48)";
  const hoverBg = "rgba(255,255,255,0.06)";

  const kpis = [
    { label: "TOTAL PREMIUM IN FORCE", value: "$142.8M", delta: "+12.4%" },
    { label: "TOTAL WORKFORCE REVENUE", value: "$28.4M", delta: "+8.2%" },
    { label: "TOTAL WORKFORCE HEADCOUNT", value: "12,482", suffix: "Active" },
    { label: "AGENTS APPOINTED", value: "3,105", delta: "+240" },
  ];

  const sectors = [
    { name: "Healthcare", subtitle: "Critical Care & Pharma", count: "1,420", delta: "+4.1%", positive: true },
    { name: "Construction", subtitle: "Infrastructure & Residential", count: "1,014", delta: "+2.8%", positive: true },
    { name: "Cannabis", subtitle: "Retail & Cultivation", count: "608", delta: "-1.4%", positive: false },
    { name: "Staffing", subtitle: "Clerical & Industrial", count: "486", delta: "STEADY", positive: null },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      padding: "32px 40px",
      fontFamily: "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif",
      color: textPrimary,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1100 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{
              fontSize: 26,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              marginBottom: 6,
              letterSpacing: "-0.02em",
            }}>Dashboard</h1>
            <p style={{
              fontSize: 14,
              fontWeight: 400,
              color: textMuted,
              margin: 0,
              letterSpacing: "0.005em",
            }}>
              Real-time performance analytics across the global ecosystem.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <button style={{
              background: "transparent",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              color: textSecondary,
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 18px",
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}>Export Report</button>
            <button style={{
              background: "#7C3AED",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 18px",
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}>+ Generate Insight</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{
              background: cardBg,
              backdropFilter: "blur(16px)",
              border: `1px solid ${borderColor}`,
              borderBottom: "2px solid #7C3AED",
              borderRadius: 12,
              padding: 22,
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                color: textMuted,
                display: "block",
                marginBottom: 16,
              }}>
                {kpi.label}
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>{kpi.value}</span>
                {kpi.suffix && <span style={{ fontSize: 13, fontWeight: 400, color: textMuted }}>{kpi.suffix}</span>}
                {kpi.delta && <span style={{ fontSize: 12, fontWeight: 500, color: "#4ADE80" }}>{kpi.delta}</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: cardBg,
          backdropFilter: "blur(16px)",
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: textMuted,
            }}>
              SECTOR PERFORMANCE DETAIL
            </span>
            <span style={{ fontSize: 12, color: "#7C3AED", cursor: "pointer", fontWeight: 500 }}>
              Quarterly View
            </span>
          </div>

          {sectors.map((sector, i) => (
            <div key={sector.name} style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 0",
              borderBottom: i < sectors.length - 1 ? `1px solid ${borderColor}` : "none",
            }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(124,58,237,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 16,
                color: "#A78BFA",
              }}>●</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, letterSpacing: "-0.005em" }}>{sector.name}</div>
                <div style={{ fontSize: 11, fontWeight: 400, color: textMuted, letterSpacing: "0.01em" }}>{sector.subtitle}</div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>{sector.count}</div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: sector.positive === true ? "#10B981" : sector.positive === false ? "#EF4444" : "rgba(255,255,255,0.4)",
                }}>{sector.delta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
