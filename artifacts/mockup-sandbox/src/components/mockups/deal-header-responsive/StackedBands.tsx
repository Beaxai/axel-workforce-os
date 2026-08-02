/**
 * Variant A — "Stacked Bands": on narrow screens the header reflows into
 * three clean rows with fixed homes — identity row, then a 4-up KPI grid band
 * (equal columns, left-aligned, smaller numerals), then the tracker.
 * Nothing floats or wraps unpredictably; every element has a fixed slot.
 */
import { NarrowDialog, Identity, Badges, Tracker, KPIS, T, upper } from "./_shared/base";

export function StackedBands() {
  return (
    <NarrowDialog note="Narrow width — header stacks into fixed bands">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Identity />
          <Badges />
        </div>
        {/* KPI band: equal 4-column grid, never wraps into the name */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: "10px 0" }}>
          {KPIS.map((k) => (
            <div key={k.label}>
              <div style={upper}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: k.dot ? "#fff" : T.accent, display: "flex", alignItems: "center", gap: 6 }}>
                {k.value}
                {k.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: k.dot, boxShadow: `0 0 8px ${k.dot}55` }} />}
              </div>
            </div>
          ))}
        </div>
        <Tracker />
      </div>
    </NarrowDialog>
  );
}
