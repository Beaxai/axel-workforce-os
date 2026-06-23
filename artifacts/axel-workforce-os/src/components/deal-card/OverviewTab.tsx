/**
 * Phase 4C / P6 — Overview = collaboration hub (Stitch layout, Axel tokens).
 *
 * A left timeline rail threads the day-grouped activity feed (real, from
 * activity_log) plus a sticky composer that persists a message. The RFI blocking
 * card is now LIVE (P6 iteration 1): real Request-For-Information items from
 * deal_rfis with a ticking countdown, internal create/resolve controls, and a
 * hard block on Approve enforced server-side. The AI quote-variation row remains
 * a STATIC placeholder deferred to P6 iteration 2.
 */
import { useEffect, useMemo, useState } from "react";
import { Sparkles, AlertTriangle, Paperclip, Zap, Plus, Check, CircleSlash } from "lucide-react";
import type { ActivityRow, RfiRow } from "./types";
import { STATUS_COLORS } from "./icons";
import { useThemeColors } from "@/lib/use-theme-colors";

export interface CreateRfiInput {
  subject: string;
  detail?: string;
  blocking: boolean;
  internal: boolean;
  dueInHours?: number;
}

interface OverviewTabProps {
  activity: ActivityRow[];
  canPost: boolean;
  posting: boolean;
  onSend: (message: string) => void;
  rfis: RfiRow[];
  isInternal: boolean;
  rfiBusy: boolean;
  onCreateRfi: (input: CreateRfiInput) => void;
  onResolveRfi: (rfiId: string, status: "RESOLVED" | "WAIVED", note?: string) => void;
}

/** Human countdown from now → dueAt. Returns label + urgency color. */
function countdown(dueAt: string | null | undefined, now: number, c: ReturnType<typeof useThemeColors>): { label: string; color: string } {
  if (!dueAt) return { label: "No deadline", color: c.textMuted };
  const due = new Date(dueAt).getTime();
  if (isNaN(due)) return { label: "No deadline", color: c.textMuted };
  let ms = due - now;
  const overdue = ms < 0;
  ms = Math.abs(ms);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  let core: string;
  if (d > 0) core = `${d}d ${h}h`;
  else if (h > 0) core = `${h}h ${m}m`;
  else if (m > 0) core = `${m}m ${s}s`;
  else core = `${s}s`;
  if (overdue) return { label: `Overdue by ${core}`, color: "#ef4444" };
  const remainMs = due - now;
  const color = remainMs < 4 * 3_600_000 ? "#ef4444" : remainMs < 24 * 3_600_000 ? STATUS_COLORS.partial : STATUS_COLORS.complete;
  return { label: `${core} remaining`, color };
}

function progressPct(createdAt: string | null | undefined, dueAt: string | null | undefined, now: number): number | null {
  if (!createdAt || !dueAt) return null;
  const start = new Date(createdAt).getTime();
  const end = new Date(dueAt).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  const pct = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, pct));
}

function dayLabel(iso?: string | null): string {
  if (!iso) return "Earlier";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Earlier";
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function authorOf(row: ActivityRow): string {
  const a = (row.metadata as { author?: string } | null)?.author;
  return a || "System";
}

function roleOf(row: ActivityRow): string | null {
  const r = (row.metadata as { role?: string } | null)?.role;
  return r || null;
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

export default function OverviewTab({
  activity, canPost, posting, onSend, rfis, isInternal, rfiBusy, onCreateRfi, onResolveRfi,
}: OverviewTabProps) {
  const c = useThemeColors();
  const [text, setText] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // RFI composer state (internal only)
  const [showRfiForm, setShowRfiForm] = useState(false);
  const [rfiSubject, setRfiSubject] = useState("");
  const [rfiDetail, setRfiDetail] = useState("");
  const [rfiBlocking, setRfiBlocking] = useState(true);
  const [rfiInternal, setRfiInternal] = useState(false);
  const [rfiDueHours, setRfiDueHours] = useState("24");

  const openRfis = useMemo(() => rfis.filter((r) => r.status === "OPEN"), [rfis]);
  const closedRfis = useMemo(() => rfis.filter((r) => r.status !== "OPEN"), [rfis]);
  const hasAnyOpenDeadline = openRfis.some((r) => !!r.dueAt);

  // Tick once a second only while there's an open RFI with a live deadline.
  useEffect(() => {
    if (!hasAnyOpenDeadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasAnyOpenDeadline]);

  const submitRfi = () => {
    const subject = rfiSubject.trim();
    if (!subject || rfiBusy) return;
    const hours = parseInt(rfiDueHours, 10);
    onCreateRfi({
      subject,
      detail: rfiDetail.trim() || undefined,
      blocking: rfiBlocking,
      internal: rfiInternal,
      dueInHours: Number.isFinite(hours) && hours > 0 ? hours : undefined,
    });
    setRfiSubject("");
    setRfiDetail("");
    setRfiBlocking(true);
    setRfiInternal(false);
    setRfiDueHours("24");
    setShowRfiForm(false);
  };

  const groups = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    for (const row of activity) {
      const key = dayLabel(row.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries());
  }, [activity]);

  const submit = () => {
    const t = text.trim();
    if (!t || posting) return;
    onSend(t);
    setText("");
  };

  const node = (color: string) => (
    <span style={{ position: "absolute", left: -25, top: 2, width: 12, height: 12, borderRadius: "50%", background: color, boxShadow: `0 0 0 3px ${c.bg}` }} />
  );

  const card: React.CSSProperties = {
    background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: "10px 12px",
  };
  const dayPill: React.CSSProperties = {
    fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: c.textMuted,
    background: c.cardBg, borderRadius: 9999, padding: "3px 10px", display: "inline-block",
  };
  const previewTag: React.CSSProperties = {
    fontSize: 9.5, color: c.textMuted, marginTop: 6, fontStyle: "italic",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ position: "relative", marginLeft: 12, paddingLeft: 24, borderLeft: `2px solid ${c.borderColor}`, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Today marker */}
        <div style={{ position: "relative" }}>
          {node(c.accentPrimary)}
          <span style={dayPill}>Today</span>
        </div>

        {/* Real activity feed grouped by day */}
        {groups.length === 0 && (
          <div style={{ position: "relative", fontSize: 12, color: c.textMuted }}>No activity yet.</div>
        )}
        {groups.map(([day, rows]) => (
          <div key={day} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {day !== "Today" && (
              <div style={{ position: "relative" }}>
                {node(c.textMuted)}
                <span style={dayPill}>{day}</span>
              </div>
            )}
            {rows.map((row) => {
              const author = authorOf(row);
              const role = roleOf(row);
              return (
                <div key={row.id} style={{ position: "relative" }}>
                  {node(c.accentPrimary)}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: c.hoverBg, color: c.textSecondary, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {initials(author)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>{author}</span>
                    {role && <span style={{ fontSize: 10.5, color: c.textMuted }}>{role}</span>}
                    <span style={{ fontSize: 10, color: c.textMuted }}>{"\u00b7"} {timeLabel(row.createdAt)}</span>
                  </div>
                  <div style={{ ...card, borderLeft: `2px solid var(--accent-primary)` }}>
                    <div style={{ fontSize: 12, color: c.textSecondary, lineHeight: 1.55 }}>{row.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* AI quote-variation — static placeholder (P6) */}
        <div style={{ position: "relative" }}>
          {node(c.accentSupport)}
          <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Sparkles style={{ width: 15, height: 15, color: c.accentSupport, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: c.textPrimary }}>AI Engine: New Quote Variation</span>
              <span style={{ fontSize: 10, color: c.textMuted, background: c.hoverBg, borderRadius: 9999, padding: "1px 7px", whiteSpace: "nowrap" }}>QR-4492-B</span>
            </div>
            <span style={{ fontSize: 10.5, color: c.textMuted, fontWeight: 600, letterSpacing: "0.04em" }}>COMPARE</span>
          </div>
          <div style={previewTag}>Preview — quote-variation engine arrives in a later phase.</div>
        </div>

        {/* RFIs — live (P6 iteration 1) */}
        {(openRfis.length > 0 || closedRfis.length > 0 || isInternal) && (
          <div style={{ position: "relative" }}>
            {node(openRfis.length > 0 ? STATUS_COLORS.partial : c.textMuted)}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ ...dayPill, color: openRfis.length > 0 ? STATUS_COLORS.partial : c.textMuted }}>
                {openRfis.length > 0 ? `${openRfis.length} Open RFI${openRfis.length > 1 ? "s" : ""}` : "RFIs"}
              </span>
              {isInternal && (
                <button
                  onClick={() => setShowRfiForm((s) => !s)}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                >
                  <Plus style={{ width: 13, height: 13 }} /> Request info
                </button>
              )}
            </div>

            {/* Internal RFI composer */}
            {isInternal && showRfiForm && (
              <div style={{ ...card, marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  value={rfiSubject}
                  onChange={(e) => setRfiSubject(e.target.value)}
                  placeholder="Subject (e.g. Safety protocol verification)"
                  style={{ background: c.inputBg, border: `1px solid ${c.inputBorder}`, borderRadius: 8, color: c.inputText, fontFamily: "inherit", fontSize: 12, padding: "7px 9px" }}
                />
                <textarea
                  value={rfiDetail}
                  onChange={(e) => setRfiDetail(e.target.value)}
                  placeholder="Details (optional)"
                  rows={2}
                  style={{ background: c.inputBg, border: `1px solid ${c.inputBorder}`, borderRadius: 8, color: c.inputText, fontFamily: "inherit", fontSize: 12, padding: "7px 9px", resize: "vertical" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: c.textSecondary, cursor: "pointer" }}>
                    <input type="checkbox" checked={rfiBlocking} onChange={(e) => setRfiBlocking(e.target.checked)} style={{ accentColor: "var(--accent-primary)" }} />
                    Blocking
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: c.textSecondary, cursor: "pointer" }}>
                    <input type="checkbox" checked={rfiInternal} onChange={(e) => setRfiInternal(e.target.checked)} style={{ accentColor: "var(--accent-primary)" }} />
                    Internal only
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: c.textSecondary }}>
                    Due in
                    <input
                      type="number"
                      min={1}
                      value={rfiDueHours}
                      onChange={(e) => setRfiDueHours(e.target.value)}
                      style={{ width: 52, background: c.inputBg, border: `1px solid ${c.inputBorder}`, borderRadius: 6, color: c.inputText, fontFamily: "inherit", fontSize: 11, padding: "4px 6px" }}
                    />
                    h
                  </label>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowRfiForm(false)}
                    disabled={rfiBusy}
                    style={{ fontSize: 11.5, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: c.textSecondary, border: `1px solid ${c.borderColor}`, background: "none", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRfi}
                    disabled={rfiBusy || !rfiSubject.trim()}
                    style={{ fontSize: 11.5, borderRadius: 8, padding: "6px 12px", cursor: rfiSubject.trim() ? "pointer" : "not-allowed", color: "#fff", background: "var(--accent-primary)", border: "none", fontWeight: 600, fontFamily: "inherit", opacity: rfiSubject.trim() ? 1 : 0.5 }}
                  >
                    {rfiBusy ? "Saving\u2026" : "Raise RFI"}
                  </button>
                </div>
              </div>
            )}

            {/* Open RFI cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {openRfis.map((r) => {
                const cd = countdown(r.dueAt, now, c);
                const pct = progressPct(r.createdAt, r.dueAt, now);
                const accent = r.blocking ? cd.color : c.textMuted;
                return (
                  <div key={r.id} style={{ ...card, borderLeft: `2px solid ${accent}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                        <AlertTriangle style={{ width: 15, height: 15, color: accent, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          RFI: {r.subject}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                        {r.internal && (
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: c.textMuted, background: c.hoverBg, borderRadius: 9999, padding: "2px 6px" }}>INTERNAL</span>
                        )}
                        {r.blocking && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em", color: STATUS_COLORS.partial, background: c.hoverBg, borderRadius: 9999, padding: "2px 7px" }}>BLOCKING</span>
                        )}
                      </div>
                    </div>
                    {r.detail && (
                      <div style={{ fontSize: 11.5, color: c.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>{r.detail}</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {pct != null && (
                        <div style={{ flex: 1, height: 5, borderRadius: 9999, background: c.cardBg, overflow: "hidden", border: `1px solid ${c.borderColor}` }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: cd.color }} />
                        </div>
                      )}
                      <span style={{ fontSize: 10, color: cd.color, whiteSpace: "nowrap", marginLeft: pct == null ? "auto" : 0 }}>{cd.label}</span>
                    </div>
                    {isInternal && (
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <button
                          onClick={() => onResolveRfi(r.id, "RESOLVED")}
                          disabled={rfiBusy}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#fff", background: "var(--accent-primary)", border: "none", fontWeight: 500, fontFamily: "inherit" }}
                        >
                          <Check style={{ width: 12, height: 12 }} /> Resolve
                        </button>
                        <button
                          onClick={() => onResolveRfi(r.id, "WAIVED")}
                          disabled={rfiBusy}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: c.textSecondary, border: `1px solid ${c.borderColor}`, background: "none", fontFamily: "inherit" }}
                        >
                          <CircleSlash style={{ width: 12, height: 12 }} /> Waive
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Closed RFIs — muted single lines */}
              {closedRfis.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: c.textMuted }}>
                  {r.status === "WAIVED" ? <CircleSlash style={{ width: 12, height: 12 }} /> : <Check style={{ width: 12, height: 12, color: STATUS_COLORS.complete }} />}
                  <span style={{ textDecoration: "line-through" }}>RFI: {r.subject}</span>
                  <span>{"\u00b7"} {r.status === "WAIVED" ? "Waived" : "Resolved"}{r.resolvedByName ? ` by ${r.resolvedByName}` : ""}</span>
                </div>
              ))}

              {openRfis.length === 0 && closedRfis.length === 0 && isInternal && !showRfiForm && (
                <div style={{ fontSize: 11.5, color: c.textMuted }}>No RFIs raised. Use "Request info" to raise one.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky composer */}
      {canPost && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: c.inputBg,
            border: `1px solid ${c.borderColor}`,
            borderRadius: 10,
            padding: "6px 8px 6px 12px",
            marginTop: 4,
          }}
        >
          <Paperclip style={{ width: 15, height: 15, color: c.textMuted, flexShrink: 0 }} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Type a message or request\u2026"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: c.inputText, fontFamily: "inherit" }}
          />
          <button
            onClick={submit}
            disabled={posting || !text.trim()}
            style={{ width: 30, height: 30, borderRadius: 8, background: "var(--gradient-cta)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "none", cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() ? 1 : 0.5, flexShrink: 0 }}
          >
            <Zap style={{ width: 15, height: 15 }} />
          </button>
        </div>
      )}
    </div>
  );
}
