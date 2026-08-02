/**
 * Variant E — "Hairline Strip": one single-line header. Name on the left,
 * the four KPI values inline on the right (labels only as tooltips/icons),
 * and the tracker reduced to a 2px progress hairline sitting on the header's
 * bottom border. ~44px total.
 */
import { NarrowDialog, T, upper } from "./_shared/base";

const stats = [["LOC", "1"], ["EMP", "24"], ["PAY", "$1.9M"], ["MOD", "1.12"]] as const;

export function HairlineStrip() {
  return (
    <NarrowDialog note="Narrow width — single line + 2px progress hairline, ~44px total">
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", minWidth: 0 }}>
          <span style={{ color: T.textMuted, fontSize: 13 }}>☆</span>
          <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>Green Valley Cultivation</span>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#7C3AED", color: "#fff", fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>JC</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {stats.map(([l, v]) => (
              <span key={l} title={l} style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ ...upper, fontSize: 8.5 }}>{l}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: l === "MOD" ? "#fff" : T.accent }}>{v}</span>
                {l === "MOD" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", alignSelf: "center" }} />}
              </span>
            ))}
          </div>
        </div>
        {/* tracker as progress hairline on the bottom border; hover reveals stage names */}
        <div title="Submitted → Indication → Quote → Bound" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ width: "42%", height: "100%", background: `linear-gradient(90deg, #7C3AED, ${T.accent})` }} />
        </div>
      </div>
    </NarrowDialog>
  );
}
