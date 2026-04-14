export function MarketplacePreview() {
  const bg = "#060608";
  const cardBg = "rgba(255,255,255,0.05)";
  const borderColor = "rgba(255,255,255,0.07)";
  const textPrimary = "#fff";
  const textSecondary = "rgba(255,255,255,0.72)";
  const textMuted = "rgba(255,255,255,0.48)";

  const verticals = [
    { name: "Healthcare", color: "#7C3AED" },
    { name: "Construction", color: "#1E40AF" },
    { name: "Cannabis", color: "#065F46" },
    { name: "Staffing", color: "#9333EA" },
    { name: "Hospitality", color: "#B45309" },
    { name: "Transportation", color: "#1D4ED8" },
    { name: "Manufacturing", color: "#4338CA" },
    { name: "Agriculture", color: "#15803D" },
    { name: "Non-Profit", color: "#6D28D9" },
    { name: "Technology", color: "#0891B2" },
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
        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "#E91E8C",
            margin: 0,
            marginBottom: 10,
          }}>Marketplace</p>
          <h1 style={{
            fontSize: 26,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            marginBottom: 10,
            letterSpacing: "-0.02em",
          }}>Solutions for businesses in every sector</h1>
          <p style={{
            fontSize: 15,
            fontWeight: 400,
            color: textMuted,
            margin: 0,
            letterSpacing: "0.005em",
          }}>
            Explore our coverage verticals and find the right solutions for your clients.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
        }}>
          {verticals.map((v) => (
            <div
              key={v.name}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                background: `linear-gradient(135deg, ${v.color}33, ${v.color}11)`,
                border: `1px solid ${borderColor}`,
                display: "flex",
                alignItems: "flex-start",
                padding: 16,
              }}
            >
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)",
              }} />
              <p style={{
                position: "relative",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                margin: 0,
                lineHeight: 1.3,
                letterSpacing: "-0.005em",
                zIndex: 1,
              }}>{v.name}</p>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 40,
          background: cardBg,
          backdropFilter: "blur(16px)",
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: 28,
        }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>Program Offering Preview</h2>
          <p style={{
            fontSize: 14,
            fontWeight: 400,
            color: textMuted,
            margin: 0,
            marginBottom: 20,
            letterSpacing: "0.005em",
          }}>
            Everything your operation needs, under one roof.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {["Payroll", "HR & Compliance", "Risk Management"].map((svc) => (
              <div key={svc} style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${borderColor}`,
                borderRadius: 10,
                padding: 20,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "rgba(124,58,237,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "#A78BFA",
                  }}>◆</div>
                  <h3 style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: textPrimary,
                    margin: 0,
                    letterSpacing: "-0.005em",
                  }}>{svc}</h3>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {["Service item one", "Service item two", "Service item three"].map((item, i) => (
                    <li key={i} style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: textSecondary,
                      paddingLeft: 14,
                      position: "relative",
                      lineHeight: 1.6,
                      letterSpacing: "0.005em",
                    }}>
                      <span style={{
                        position: "absolute",
                        left: 0,
                        top: 8,
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        background: "#7C3AED",
                      }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
