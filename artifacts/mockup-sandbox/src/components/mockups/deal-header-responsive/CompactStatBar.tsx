/**
 * Variant B — "Compact Stat Bar": on narrow screens the four big KPI numbers
 * collapse into one row of small label:value chips under the name. The header
 * gets much shorter, the map stays visible, and chips scroll horizontally if
 * space runs out instead of wrapping.
 */
import { NarrowDialog, Identity, Badges, Tracker, KPIS, T, upper } from "./_shared/base";

export function CompactStatBar() {
  return (
    <NarrowDialog note="Narrow width — KPIs become a single chip strip">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Identity />
          <Badges />
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {KPIS.map((k) => (
            <span key={k.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 9999, padding: "5px 11px" }}>
              <span style={{ ...upper, fontSize: 9.5 }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: k.dot ? "#fff" : T.accent }}>{k.value}</span>
              {k.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: k.dot, boxShadow: `0 0 8px ${k.dot}55` }} />}
            </span>
          ))}
        </div>
        <Tracker />
      </div>
    </NarrowDialog>
  );
}
