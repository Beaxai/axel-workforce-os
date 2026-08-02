/**
 * Variant A — "Quiet List": exact Documents-section aesthetic. One bordered
 * container, uppercase column header, rows separated by hairline dividers,
 * no per-row cards. Completed rows sit at the bottom, dimmed.
 */
import { DrawerFrame, TASKS, T, Check, label } from "./_shared/base";

export function QuietList() {
  const open = TASKS.filter((t) => !t.done);
  const done = TASKS.filter((t) => t.done);
  const rows = [...open, ...done];
  return (
    <DrawerFrame>
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", background: T.cardBg }}>
        <div style={{ ...label, padding: "10px 12px", borderBottom: `1px solid ${T.inputBorder}` }}>Task</div>
        {rows.map((t, i) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderBottom: i === rows.length - 1 ? "none" : `1px solid ${T.border}`, opacity: t.done ? 0.55 : 1 }}>
            <Check done={t.done} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: T.textPrimary, textDecoration: t.done ? "line-through" : "none" }}>{t.name}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                {t.assignee && <span style={{ color: T.accent, fontWeight: 600 }}>{t.assignee}</span>}
                {t.assignee && t.due ? " · " : ""}{t.due}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DrawerFrame>
  );
}
