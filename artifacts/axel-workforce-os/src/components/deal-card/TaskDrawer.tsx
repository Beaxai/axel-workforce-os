/**
 * Persistent, collapsible task drawer — right pane of the deal-card dialog.
 * Replaces the old Tasks tab so tasks stay visible on every tab. Collapsed it
 * is a slim vertical strip (icon + count + red overdue dot); expanded it shows
 * a quick-add form plus tasks grouped Overdue / Open / Done. Styled strictly
 * with the app design system (theme tokens, existing button primitives) so it
 * reads as part of the card, not a new surface.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckSquare, ChevronLeft, ChevronRight, Plus, Circle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { PinkButton, GhostButton } from "@/components/ui/axel-index";
import UserMiniProfile from "@/components/user-profile/UserMiniProfile";
import { winHas, type TimeWindow } from "./SupportingTabs";

type TaskEntry = { id: string; taskName: string; assignedTo?: string | null; assigneeName?: string | null; dueDate?: string; status?: string };

/** Done in any historical casing — rows were written as "completed", "COMPLETE", … */
const isDone = (t: TaskEntry) => {
  const s = (t.status || "").toLowerCase();
  return s === "completed" || s === "complete";
};

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** "Jul 29" style short date; local-safe for date-only strings. */
const fmtDue = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const COLLAPSED_KEY = "dealTaskDrawerCollapsed";

export default function TaskDrawer({ dealId, timeWindow = null }: { dealId: string; timeWindow?: TimeWindow }) {
  const c = useThemeColors();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string; role?: string | null }[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ taskName: "", assignedTo: "", dueDate: "" });
  const [saving, setSaving] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try { localStorage.setItem(COLLAPSED_KEY, v ? "0" : "1"); } catch { /* ignore */ }
      return !v;
    });
  };

  // People attached to this deal (team + scoped directory) for the assignee dropdown.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get<{ directory?: { id: string; name: string; role?: string | null }[] }>(`/deal-card/${dealId}/submission`);
        if (active) setPeople(res.directory ?? []);
      } catch { if (active) setPeople([]); }
    })();
    return () => { active = false; };
  }, [dealId]);

  // Sequence guard — a slow response for a previous deal must never overwrite
  // the tasks of the deal currently shown (drawer persists across deal switches).
  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const rows = await api.get<TaskEntry[]>(`/deals/${dealId}/tasks`);
      if (seq === loadSeq.current) setTasks(rows);
    } catch {
      if (seq === loadSeq.current) setTasks([]);
    }
  }, [dealId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.taskName.trim() || saving) return;
    setSaving(true);
    try {
      await api.post(`/tasks`, {
        dealId,
        taskName: form.taskName.trim(),
        assignedTo: form.assignedTo || null,
        dueDate: form.dueDate || null,
      });
      setForm({ taskName: "", assignedTo: "", dueDate: "" });
      setAdding(false);
      await load();
    } catch { /* surfaced by the list not updating */ } finally { setSaving(false); }
  };

  const toggleDone = async (t: TaskEntry) => {
    if (busyId) return;
    setBusyId(t.id);
    try {
      await api.patch(`/tasks/${t.id}`, { status: isDone(t) ? "OPEN" : "completed" });
      await load();
    } catch { /* leave as-is */ } finally { setBusyId(null); }
  };

  const visible = tasks.filter((t) => winHas(timeWindow, t.dueDate));
  const done = visible.filter(isDone);
  const open = visible.filter((t) => !isDone(t));
  const today = startOfToday();
  const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate.length === 10 ? `${t.dueDate}T00:00:00` : t.dueDate).getTime() < today);
  const current = open.filter((t) => !overdue.includes(t));

  /* ------------------------------------------------------------ collapsed */
  if (collapsed) {
    return (
      <div
        style={{ width: 40, flexShrink: 0, borderLeft: `1px solid ${c.borderColor}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, gap: 10 }}
      >
        <button
          type="button"
          data-testid="button-expand-task-drawer"
          onClick={toggleCollapsed}
          title="Show tasks"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: c.textMuted, padding: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "inherit" }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          <span style={{ position: "relative" }}>
            <CheckSquare style={{ width: 16, height: 16, color: overdue.length ? "#ef4444" : c.textMuted }} />
            {overdue.length > 0 && (
              <span style={{ position: "absolute", top: -3, right: -3, width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />
            )}
          </span>
          <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", writingMode: "vertical-rl", color: c.textMuted }}>
            Tasks
          </span>
          {open.length > 0 && (
            <span data-testid="text-collapsed-task-count" style={{ fontSize: 10.5, fontWeight: 600, color: c.textSecondary, background: c.hoverBg, border: `1px solid ${c.borderColor}`, borderRadius: 9, padding: "1px 6px" }}>
              {open.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------- expanded */
  const input: React.CSSProperties = {
    background: c.inputBg, border: `1px solid ${c.inputBorder}`, borderRadius: 8,
    color: c.inputText, fontFamily: "inherit", fontSize: 13, padding: "8px 10px", width: "100%", boxSizing: "border-box",
  };
  const groupLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: c.textMuted,
  };

  const row = (t: TaskEntry) => {
    const rowDone = isDone(t);
    const isOverdue = !rowDone && overdue.includes(t);
    return (
      <div key={t.id} data-testid={`row-task-${t.id}`} style={{ display: "flex", alignItems: "flex-start", gap: 9, background: c.cardBg, border: `1px solid ${isOverdue ? "rgba(239,68,68,0.45)" : c.borderColor}`, borderRadius: 10, padding: "10px 12px" }}>
        <button
          type="button"
          data-testid={`button-toggle-task-${t.id}`}
          onClick={() => toggleDone(t)}
          disabled={busyId === t.id}
          title={rowDone ? "Reopen task" : "Mark complete"}
          style={{ background: "transparent", border: "none", padding: 0, cursor: busyId === t.id ? "wait" : "pointer", marginTop: 1, flexShrink: 0 }}
        >
          {rowDone
            ? <CheckCircle2 style={{ width: 16, height: 16, color: "#4caf50" }} />
            : <Circle style={{ width: 16, height: 16, color: isOverdue ? "#ef4444" : c.textMuted }} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: rowDone ? c.textMuted : c.textPrimary, textDecoration: rowDone ? "line-through" : "none", overflowWrap: "break-word" }}>
            {t.taskName}
          </div>
          {(t.assigneeName || t.dueDate) && (
            <div style={{ fontSize: 11, color: c.textMuted, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
              {t.assignedTo && t.assigneeName ? (
                <UserMiniProfile userId={t.assignedTo}>
                  <button type="button" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "var(--accent-primary)", fontWeight: 600, fontFamily: "inherit" }}>
                    {t.assigneeName}
                  </button>
                </UserMiniProfile>
              ) : t.assigneeName ? <span>{t.assigneeName}</span> : null}
              {t.assigneeName && t.dueDate ? <span>{"\u00b7"}</span> : null}
              {t.dueDate ? (
                <span style={{ color: isOverdue ? "#ef4444" : c.textMuted, fontWeight: isOverdue ? 600 : 400 }}>
                  {isOverdue ? `${fmtDue(t.dueDate)} \u2014 overdue` : fmtDue(t.dueDate)}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="panel-task-drawer"
      style={{ width: 264, flexShrink: 0, borderLeft: `1px solid ${c.borderColor}`, display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${c.borderColor}` }}>
        <CheckSquare style={{ width: 14, height: 14, color: "var(--accent-primary)" }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: c.textSecondary }}>Tasks</span>
        {open.length > 0 && (
          <span data-testid="text-open-task-count" style={{ fontSize: 10.5, fontWeight: 600, color: c.textSecondary, background: c.hoverBg, border: `1px solid ${c.borderColor}`, borderRadius: 9, padding: "1px 6px" }}>
            {open.length}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
          <button
            type="button"
            data-testid="button-add-task"
            onClick={() => setAdding((v) => !v)}
            title="Add task"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: adding ? "var(--accent-primary)" : c.textMuted, padding: 4, display: "flex" }}
          >
            <Plus style={{ width: 15, height: 15 }} />
          </button>
          <button
            type="button"
            data-testid="button-collapse-task-drawer"
            onClick={toggleCollapsed}
            title="Hide tasks"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: c.textMuted, padding: 4, display: "flex" }}
          >
            <ChevronRight style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {adding && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: 10 }}>
            <input style={input} placeholder="Task name" value={form.taskName} autoFocus onChange={(e) => setForm((f) => ({ ...f, taskName: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
            <select
              style={{ ...input, cursor: "pointer", color: form.assignedTo ? c.inputText : c.textMuted }}
              data-testid="select-task-assignee"
              value={form.assignedTo}
              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.role ? ` \u2014 ${p.role}` : ""}</option>
              ))}
            </select>
            <input style={input} type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            <div style={{ display: "flex", gap: 6 }}>
              <GhostButton onClick={() => { setAdding(false); setForm({ taskName: "", assignedTo: "", dueDate: "" }); }} style={{ flex: 1, padding: "7px 8px", fontSize: 12 }}>Cancel</GhostButton>
              <PinkButton onClick={create} style={{ flex: 1, padding: "7px 8px", fontSize: 12 }}>{saving ? "Saving\u2026" : "Create"}</PinkButton>
            </div>
          </div>
        )}

        {visible.length === 0 && !adding && (
          <div data-testid="text-no-tasks" style={{ padding: "28px 0", textAlign: "center", fontSize: 12.5, color: c.textMuted }}>
            {tasks.length === 0 ? "No tasks yet." : "No tasks in the selected time frame."}
          </div>
        )}

        {overdue.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ ...groupLabel, color: "#ef4444" }}>Overdue ({overdue.length})</span>
            {overdue.map(row)}
          </div>
        )}

        {current.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {overdue.length > 0 && <span style={groupLabel}>Open</span>}
            {current.map(row)}
          </div>
        )}

        {done.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              type="button"
              data-testid="button-toggle-completed-tasks"
              onClick={() => setShowDone((v) => !v)}
              style={{ ...groupLabel, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
            >
              {showDone ? <ChevronRight style={{ width: 11, height: 11, transform: "rotate(90deg)" }} /> : <ChevronRight style={{ width: 11, height: 11 }} />}
              Completed ({done.length})
            </button>
            {showDone && done.map(row)}
          </div>
        )}
      </div>
    </div>
  );
}
