/**
 * Shared scaffolding for the deal-card header responsive mockups.
 * Mirrors the app's dark header-over-map look (legibility gradients over a
 * faint map suggestion) and provides the real deal data from the dialog:
 * Green Valley Cultivation / Cannabis / WC / Effective 8/31/2026 / KPIs.
 * Each variant renders inside a narrow (~740px) dialog frame so the
 * small-screen behavior is what the preview shows.
 */
import type { CSSProperties, ReactNode } from "react";

export const T = {
  bg: "#060608",
  headerBg: "#0b0b0f",
  cardBg: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.07)",
  hoverBg: "rgba(255,255,255,0.06)",
  textPrimary: "#fff",
  textSecondary: "rgba(255,255,255,0.72)",
  textMuted: "rgba(255,255,255,0.48)",
  softGrey: "#9b9ba4",
  accent: "#E91E8C",
  accentSoft: "rgba(233,30,140,0.15)",
};

export const KPIS = [
  { label: "LOCATIONS", value: "1" },
  { label: "EMPLOYEES", value: "24" },
  { label: "PAYROLL", value: "$1.9M" },
  { label: "EXMOD", value: "1.12", dot: "#f59e0b" },
];

export const upper: CSSProperties = {
  fontSize: 10, letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase", color: T.softGrey,
};

export function Badges() {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {["Cannabis", "WC"].map((b) => (
        <span key={b} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: T.cardBg, color: T.textMuted, border: `1px solid ${T.border}` }}>{b}</span>
      ))}
      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: T.accentSoft, color: T.accent, border: `1px solid ${T.accentSoft}`, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>
        Effective 8/31/2026
      </span>
    </div>
  );
}

export function Identity() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span style={{ color: T.textMuted, fontSize: 15 }}>☆</span>
      <span style={{ fontSize: 17, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Green Valley Cultivation</span>
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#7C3AED", color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>JC</span>
    </div>
  );
}

export function Tracker() {
  const steps = ["Submitted", "Indication", "Quote", "Bound"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 4px" }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i === steps.length - 1 ? "0 0 auto" : 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: i <= 1 ? "#fff" : "rgba(255,255,255,0.16)", boxShadow: i <= 1 ? "0 0 10px rgba(255,255,255,0.65)" : "none" }} />
            <span style={{ fontSize: 9.5, color: i <= 1 ? T.textSecondary : T.textMuted, whiteSpace: "nowrap" }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.16)", margin: "0 6px", marginBottom: 14 }} />}
        </div>
      ))}
    </div>
  );
}

/** Narrow dialog frame with the map-ish header backdrop. */
export function NarrowDialog({ children, note }: { children: ReactNode; note: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "rgba(0,0,0,0.68)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 22, gap: 10, fontFamily: "Inter, system-ui, sans-serif", color: T.textPrimary }}>
      <div style={{ fontSize: 11.5, color: T.textMuted }}>{note}</div>
      <div style={{ width: 700, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", background: T.bg }}>
        <div style={{ position: "relative", borderBottom: `1px solid ${T.border}`, background: `radial-gradient(120% 140% at 85% 10%, rgba(124,58,237,0.10), transparent 55%), ${T.headerBg}` }}>
          {/* faint map dots suggestion */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.25, background: "radial-gradient(circle at 72% 42%, rgba(255,255,255,0.35) 1.5px, transparent 2px), radial-gradient(circle at 60% 60%, rgba(233,30,140,0.8) 2px, transparent 3px)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>{children}</div>
        </div>
        {/* body hint */}
        <div style={{ display: "flex", height: 130 }}>
          <div style={{ width: 120, borderRight: `1px solid ${T.border}`, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {["Overview", "Submission", "Documents", "Quote"].map((n, i) => (
              <span key={n} style={{ fontSize: 11.5, color: i === 0 ? T.textPrimary : T.textMuted }}>{n}</span>
            ))}
          </div>
          <div style={{ flex: 1, padding: 12, color: T.textMuted, fontSize: 12 }}>Tab content…</div>
        </div>
      </div>
    </div>
  );
}
