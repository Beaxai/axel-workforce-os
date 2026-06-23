/**
 * Phase 4C — Overview = collaboration hub (Stitch layout, Axel tokens).
 *
 * A left timeline rail threads the day-grouped activity feed (real, from
 * activity_log) plus a sticky composer that persists a message. The AI
 * quote-variation row and the RFI blocking card are STATIC placeholders styled
 * to match the Stitch reference but deferred to P6 (ruling #2) — they carry an
 * explicit "preview" marker and perform no work.
 */
import { useMemo, useState } from "react";
import { Sparkles, AlertTriangle, Paperclip, Zap } from "lucide-react";
import type { ActivityRow } from "./types";
import { STATUS_COLORS } from "./icons";
import { useThemeColors } from "@/lib/use-theme-colors";

interface OverviewTabProps {
  activity: ActivityRow[];
  canPost: boolean;
  posting: boolean;
  onSend: (message: string) => void;
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

export default function OverviewTab({ activity, canPost, posting, onSend }: OverviewTabProps) {
  const c = useThemeColors();
  const [text, setText] = useState("");

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

        {/* RFI blocking — static placeholder (P6) */}
        <div style={{ position: "relative" }}>
          {node(STATUS_COLORS.partial)}
          <span style={{ ...dayPill, color: STATUS_COLORS.partial, marginBottom: 6 }}>Critical Pending</span>
          <div style={{ ...card, borderLeft: `2px solid ${STATUS_COLORS.partial}`, marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <AlertTriangle style={{ width: 15, height: 15, color: STATUS_COLORS.partial }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>RFI: Safety Protocol Verification</span>
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em", color: STATUS_COLORS.partial, background: c.hoverBg, borderRadius: 9999, padding: "2px 7px" }}>BLOCKING</span>
            </div>
            <div style={{ fontSize: 11.5, color: c.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>
              Sector requires validated fire-suppression logs for class 8810 eligibility.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 9999, background: c.cardBg, overflow: "hidden" }}>
                <div style={{ width: "60%", height: "100%", background: STATUS_COLORS.partial }} />
              </div>
              <span style={{ fontSize: 10, color: STATUS_COLORS.partial, whiteSpace: "nowrap" }}>4h remaining</span>
            </div>
            <div style={previewTag}>Preview — RFI countdown + blocking logic arrives in a later phase.</div>
          </div>
        </div>
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
