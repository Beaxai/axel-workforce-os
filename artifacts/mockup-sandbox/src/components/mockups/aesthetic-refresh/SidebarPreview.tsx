export function SidebarPreview() {
  const bg = "#060608";
  const sidebarBg = "rgba(255,255,255,0.025)";
  const borderColor = "rgba(255,255,255,0.07)";
  const textPrimary = "#fff";
  const textSecondary = "rgba(255,255,255,0.62)";
  const textMuted = "rgba(255,255,255,0.48)";
  const hoverBg = "rgba(255,255,255,0.06)";
  const glassBg = "rgba(255,255,255,0.035)";
  const headerBg = "rgba(255,255,255,0.035)";

  const navItems = [
    { label: "Dashboard", active: true },
    { label: "Marketplace", active: false },
    { label: "Agent Pipeline", active: false },
    { label: "Policy Book", active: false },
    { label: "Compliance Hub", active: false },
    { label: "Reports", active: false },
    { label: "Settings", active: false },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif",
      color: textPrimary,
      display: "flex",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <aside style={{
        width: 240,
        display: "flex",
        flexDirection: "column" as const,
        flexShrink: 0,
        background: sidebarBg,
        borderRight: `1px solid ${borderColor}`,
      }}>
        <div style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: `1px solid ${borderColor}`,
        }}>
          <span style={{
            fontSize: 17,
            fontWeight: 700,
            color: textPrimary,
            letterSpacing: "-0.02em",
          }}>AXEL</span>
          <span style={{ color: textMuted, fontSize: 18, cursor: "pointer" }}>‹</span>
        </div>

        <nav style={{
          flex: 1,
          padding: "10px 8px",
          display: "flex",
          flexDirection: "column" as const,
          gap: 2,
        }}>
          {navItems.map((item) => (
            <div key={item.label} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "9px 14px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: item.active ? 600 : 500,
              letterSpacing: "0.005em",
              background: item.active ? "rgba(233,30,140,0.12)" : "transparent",
              color: item.active ? "#E91E8C" : textSecondary,
              borderLeft: item.active ? "3px solid #E91E8C" : "3px solid transparent",
              cursor: "pointer",
              transition: "background 0.15s",
            }}>
              <span style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: item.active ? "rgba(233,30,140,0.3)" : "rgba(255,255,255,0.08)",
                display: "inline-block",
                flexShrink: 0,
              }} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={{ padding: "12px", borderTop: `1px solid ${borderColor}` }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.01em",
            background: glassBg,
            border: `1px solid ${borderColor}`,
            color: textSecondary,
            marginBottom: 8,
          }}>
            <span>Admin</span>
            <span style={{ fontSize: 10 }}>▾</span>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            fontSize: 14,
            fontWeight: 400,
            color: textMuted,
            cursor: "pointer",
            letterSpacing: "0.005em",
          }}>
            <span style={{ fontSize: 14 }}>→</span>
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" as const }}>
        <header style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: `1px solid ${borderColor}`,
          background: headerBg,
          backdropFilter: "blur(12px)",
        }}>
          <span style={{
            fontSize: 15,
            fontWeight: 600,
            color: textPrimary,
            letterSpacing: "-0.01em",
          }}>Workforce OS</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: textMuted, fontSize: 16, cursor: "pointer" }}>☀</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(233,30,140,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#E91E8C",
              }}>JD</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: textPrimary, margin: 0, lineHeight: 1.2, letterSpacing: "-0.005em" }}>Jane Doe</p>
                <p style={{ fontSize: 11, fontWeight: 400, color: textMuted, margin: 0, lineHeight: 1.2, letterSpacing: "0.01em" }}>Admin</p>
              </div>
            </div>
          </div>
        </header>
        <div style={{
          flex: 1,
          padding: "32px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ textAlign: "center" as const }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em", margin: 0, marginBottom: 8 }}>
              Sidebar + Header Preview
            </p>
            <p style={{ fontSize: 14, fontWeight: 400, color: textMuted, margin: 0, letterSpacing: "0.005em" }}>
              Source Sans 3 typography with refined dark surfaces
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
