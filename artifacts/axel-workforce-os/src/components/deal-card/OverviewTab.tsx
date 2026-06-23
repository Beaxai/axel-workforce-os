/**
 * Phase 4C — Overview = collaboration hub. Day-grouped activity timeline + a
 * sticky composer that persists a message to the activity feed. The AI quote
 * variation + RFI blocking widgets are STATIC placeholders, deferred to P6
 * (ruling #2).
 */
import { useMemo, useState } from "react";
import { Sparkles, AlertTriangle, Send, Paperclip } from "lucide-react";
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

  const msgBox: React.CSSProperties = {
    background: c.cardBg,
    border: `1px solid ${c.borderColor}`,
    borderRadius: 10,
    padding: "10px 12px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Static AI placeholder (P6) */}
      <div style={{ ...msgBox, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Sparkles style={{ width: 15, height: 15, color: c.textMuted }} />
          <span style={{ fontSize: 11.5, color: c.textSecondary }}>AI Engine — quote variations arrive in a later phase</span>
        </div>
        <span style={{ fontSize: 10, color: c.textMuted }}>Soon</span>
      </div>

      {/* Static RFI placeholder (P6) */}
      <div style={{ ...msgBox, borderLeft: `2px solid ${STATUS_COLORS.partial}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <AlertTriangle style={{ width: 15, height: 15, color: STATUS_COLORS.partial }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: c.textPrimary }}>RFI workflow</span>
          </div>
          <span style={{ fontSize: 10, color: STATUS_COLORS.partial }}>Planned</span>
        </div>
        <div style={{ fontSize: 11.5, color: c.textSecondary, lineHeight: 1.5 }}>
          Blocking requests-for-information with countdowns land in a later phase.
        </div>
      </div>

      {/* Activity timeline grouped by day */}
      {groups.length === 0 && (
        <div style={{ padding: "24px 0", textAlign: "center", fontSize: 12, color: c.textMuted }}>No activity yet.</div>
      )}
      {groups.map(([day, rows]) => (
        <div key={day} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: c.textMuted }}>{day}</div>
          {rows.map((row) => {
            const author = authorOf(row);
            return (
              <div key={row.id} style={msgBox}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.hoverBg, color: c.textSecondary, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {initials(author)}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: c.textPrimary }}>{author}</span>
                  <span style={{ fontSize: 10, color: c.textMuted }}>{timeLabel(row.createdAt)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: c.textSecondary, lineHeight: 1.5 }}>{row.description}</div>
              </div>
            );
          })}
        </div>
      ))}

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
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 11.5, color: c.inputText, fontFamily: "inherit" }}
          />
          <button
            onClick={submit}
            disabled={posting || !text.trim()}
            style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "none", cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() ? 1 : 0.5, flexShrink: 0 }}
          >
            <Send style={{ width: 15, height: 15 }} />
          </button>
        </div>
      )}
    </div>
  );
}
