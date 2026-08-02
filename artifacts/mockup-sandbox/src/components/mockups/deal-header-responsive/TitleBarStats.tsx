/**
 * Variant F — "Title Bar Stats": header becomes a true title bar. Name +
 * stage chip on line one; KPIs move OUT of the header entirely into a slim
 * sticky strip at the top of the tab content, so the header itself is ~40px
 * and the stats scroll with context but stay one glance away.
 */
import { T, upper } from "./_shared/base";

const stats = [["LOCATIONS", "1"], ["EMPLOYEES", "24"], ["PAYROLL", "$1.9M"], ["EXMOD", "1.12"]] as const;

export function TitleBarStats() {
  return (
    <div style={{ minHeight: "100vh", background: "rgba(0,0,0,0.68)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 22, gap: 10, fontFamily: "Inter, system-ui, sans-serif", color: T.textPrimary }}>
      <div style={{ fontSize: 11.5, color: T.textMuted }}>Narrow width — ~40px title bar; KPIs live in a slim strip inside the body</div>
      <div style={{ width: 700, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", background: T.bg }}>
        {/* title bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: T.headerBg }}>
          <span style={{ color: T.textMuted, fontSize: 13 }}>☆</span>
          <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>Green Valley Cultivation</span>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#7C3AED", color: "#fff", fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>JC</span>
          <span style={{ marginLeft: "auto", fontSize: 10.5, color: T.accent, background: T.accentSoft, borderRadius: 9999, padding: "2px 9px", fontWeight: 600, flexShrink: 0 }}>Indication · Eff 8/31/26</span>
        </div>
        <div style={{ display: "flex", height: 210 }}>
          <div style={{ width: 120, borderRight: `1px solid ${T.border}`, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {["Overview", "Submission", "Documents", "Quote"].map((n, i) => (
              <span key={n} style={{ fontSize: 11.5, color: i === 0 ? T.textPrimary : T.textMuted }}>{n}</span>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* sticky KPI strip at the top of the content pane */}
            <div style={{ display: "flex", gap: 18, alignItems: "center", padding: "8px 14px", borderBottom: `1px solid ${T.border}`, background: "rgba(255,255,255,0.02)" }}>
              {stats.map(([l, v]) => (
                <span key={l} style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ ...upper, fontSize: 8.5 }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: l === "EXMOD" ? "#fff" : T.accent }}>{v}</span>
                  {l === "EXMOD" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", alignSelf: "center" }} />}
                </span>
              ))}
            </div>
            <div style={{ padding: 12, color: T.textMuted, fontSize: 12 }}>Tab content…</div>
          </div>
        </div>
      </div>
    </div>
  );
}
