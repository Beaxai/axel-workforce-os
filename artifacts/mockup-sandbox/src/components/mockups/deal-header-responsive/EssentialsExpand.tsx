/**
 * Variant C — "Essentials + Expandable Details": at narrow widths the header
 * keeps only the essentials (name, badges, tracker). The KPIs move behind a
 * quiet "Deal stats" disclosure row that expands in place — shown expanded
 * here so the open state is visible. Shortest header of the three.
 */
import { NarrowDialog, Identity, Badges, Tracker, KPIS, T, upper } from "./_shared/base";

export function EssentialsExpand() {
  return (
    <NarrowDialog note="Narrow width — KPIs live behind a 'Deal stats' disclosure (shown open)">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Identity />
          <Badges />
        </div>
        {/* disclosure row */}
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, background: T.cardBg, overflow: "hidden" }}>
          <div style={{ ...upper, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", cursor: "pointer", color: T.textSecondary }}>
            <span style={{ fontSize: 9, transform: "rotate(90deg)", display: "inline-block" }}>▸</span> Deal stats
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "0 12px 10px", borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
            {KPIS.map((k) => (
              <div key={k.label}>
                <div style={upper}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: k.dot ? "#fff" : T.accent, display: "flex", alignItems: "center", gap: 5 }}>
                  {k.value}
                  {k.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: k.dot, boxShadow: `0 0 8px ${k.dot}55` }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
        <Tracker />
      </div>
    </NarrowDialog>
  );
}
