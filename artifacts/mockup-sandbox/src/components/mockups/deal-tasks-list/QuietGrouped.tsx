/**
 * Variant C — "Quiet List + Completed": docs-style bordered container for open
 * tasks, with completed tasks tucked behind a small collapsible footer line
 * inside the same container, keeping one calm surface.
 */
import { DrawerFrame, TASKS, T, Check, label } from "./_shared/base";

export function QuietGrouped() {
  const open = TASKS.filter((t) => !t.done);
  const done = TASKS.filter((t) => t.done);
  return (
    <DrawerFrame>
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", background: T.cardBg }}>
        {open.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderBottom: `1px solid ${T.border}` }}>
            <Check />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: T.textPrimary }}>{t.name}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                {t.assignee && <span style={{ color: T.accent, fontWeight: 600 }}>{t.assignee}</span>}
                {t.assignee && t.due ? " · " : ""}{t.due}
              </div>
            </div>
          </div>
        ))}
        <div style={{ ...label, padding: "9px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          <span style={{ fontSize: 9 }}>▸</span> Completed ({done.length})
        </div>
      </div>
    </DrawerFrame>
  );
}
