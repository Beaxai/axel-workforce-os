/**
 * Variant B — "Flat Dividers": the simplest possible list. No container, no
 * cards — just rows on the dialog background separated by hairlines, with the
 * date right-aligned so names and metadata scan as two clean columns.
 */
import { DrawerFrame, TASKS, T, Check } from "./_shared/base";

export function FlatDividers() {
  const open = TASKS.filter((t) => !t.done);
  const done = TASKS.filter((t) => t.done);
  const rows = [...open, ...done];
  return (
    <DrawerFrame>
      <div>
        {rows.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 2px", borderBottom: `1px solid ${T.border}`, opacity: t.done ? 0.55 : 1 }}>
            <Check done={t.done} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, color: T.textPrimary, textDecoration: t.done ? "line-through" : "none" }}>{t.name}</div>
              {t.assignee && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{t.assignee}</div>}
            </div>
            {t.due && <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0 }}>{t.due}</span>}
          </div>
        ))}
      </div>
    </DrawerFrame>
  );
}
