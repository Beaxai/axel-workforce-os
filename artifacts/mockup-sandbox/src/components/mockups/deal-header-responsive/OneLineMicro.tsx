/**
 * Variant D — "One-Line Micro": the entire narrow header is two slim lines.
 * Line 1: name + badges. Line 2: the four KPIs as inline muted text separated
 * by dots, with the tracker reduced to a tiny "Stage 2/4 · Indication" chip.
 * Total header height ~64px — the map artwork is dropped at narrow widths.
 */
import { NarrowDialog, Identity, T, upper } from "./_shared/base";

const stats = [["Locations", "1"], ["Employees", "24"], ["Payroll", "$1.9M"], ["ExMod", "1.12"]] as const;

export function OneLineMicro() {
  return (
    <NarrowDialog note="Narrow width — two slim lines, ~64px total">
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Identity />
          <span style={{ fontSize: 10.5, padding: "1px 7px", borderRadius: 9999, background: T.accentSoft, color: T.accent, fontWeight: 600, flexShrink: 0 }}>Eff 8/31/26</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden" }}>
          {stats.map(([l, v], i) => (
            <span key={l} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              <span style={{ ...upper, fontSize: 9 }}>{l}</span>
              <span style={{ color: l === "ExMod" ? "#fff" : T.accent, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{v}</span>
              {l === "ExMod" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b" }} />}
              {i < stats.length - 1 && <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>}
            </span>
          ))}
          <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 10.5, color: T.textSecondary, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 9999, padding: "1px 8px" }}>
            Stage 2/4 · Indication
          </span>
        </div>
      </div>
    </NarrowDialog>
  );
}
