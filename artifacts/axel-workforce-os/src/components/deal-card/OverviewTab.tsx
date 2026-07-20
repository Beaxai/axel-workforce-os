/**
 * Phase 4C / P6 — Overview = collaboration hub (Stitch layout, Axel tokens).
 *
 * A clean day-grouped activity feed (real, from activity_log) — avatar, name,
 * timestamp, message bubble; no timeline rail — plus a sticky composer that
 * persists a message. The RFI blocking
 * card is now LIVE (P6 iteration 1): real Request-For-Information items from
 * deal_rfis with a ticking countdown, internal create/resolve controls, and a
 * hard block on Approve enforced server-side. The AI quote-variation row remains
 * a STATIC placeholder deferred to P6 iteration 2.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, AlertTriangle, ArrowUp, Plus, Check, CircleSlash, X, ArrowRight, SlidersHorizontal, FileUp, RefreshCw, Zap, Link2, FilePlus2 } from "lucide-react";
import type { ActivityRow, RfiRow, QuoteVariation, VariationLevers, PreviewVariationResponse, DealDirectoryEntry } from "./types";
import { STATUS_COLORS } from "./icons";
import { useThemeColors } from "@/lib/use-theme-colors";
import UserMiniProfile from "@/components/user-profile/UserMiniProfile";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Feature flag: AI Quote Variations row on the deal card Overview tab.
 * Temporarily hidden per product decision (feature saved for later).
 * Flip to true to restore — the API routes and all wiring remain live.
 */
const SHOW_AI_QUOTE_VARIATIONS = false;

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
  onSend: (message: string, mentions?: string[]) => void;
  /** Deal-scoped participant directory (mention candidates + avatar lookup). */
  directory: DealDirectoryEntry[];
  rfis: RfiRow[];
  isInternal: boolean;
  rfiBusy: boolean;
  onCreateRfi: (input: CreateRfiInput) => void;
  onResolveRfi: (rfiId: string, status: "RESOLVED" | "WAIVED", note?: string) => void;
  variations: QuoteVariation[];
  basePremium: number;
  baseLevers: VariationLevers | null;
  varHasQuote: boolean;
  varUsedAi: boolean;
  varLoading: boolean;
  varApplying: string | null;
  onGenerateVariations: () => void;
  onApplyVariation: (v: QuoteVariation) => void;
  onPreviewLevers: (levers: VariationLevers) => Promise<PreviewVariationResponse>;
  onApplyLevers: (levers: VariationLevers, label: string) => void;
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

/** Acronyms that stay all-caps when prettifying ALL_CAPS tokens. */
const KEEP_CAPS = new Set(["WC", "PEO", "ASO", "RFI", "AI", "UW", "FEIN", "LLC", "ACORD", "CSA", "ID"]);
/** Bare (no-underscore) stage/status words that should still be prettified. */
const PRETTY_WORDS = new Set(["INDICATION", "BOUND", "CLIENT", "LOST", "QUALIFIED"]);

function titleCaseToken(token: string): string {
  return token
    .split("_")
    .map((w) => (KEEP_CAPS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

/** "Stage changed from INDICATION to BIND_ORDER." → "Stage changed from Indication to Bind Order." */
function prettifyTokens(text: string): string {
  return text.replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b|\b[A-Z]{3,}\b/g, (tok) => {
    if (tok.includes("_")) return titleCaseToken(tok);
    if (PRETTY_WORDS.has(tok)) return titleCaseToken(tok);
    return tok; // bare acronyms (ACORD, FEIN, …) stay as-is
  });
}

/** Human-readable actor label + icon for rows with no person attached. */
function systemEventMeta(eventType: string | null | undefined): { label: string; Icon: typeof Zap } {
  const t = (eventType ?? "").toLowerCase();
  if (t.includes("upload")) return { label: "Document uploaded", Icon: FileUp };
  if (t.includes("stage")) return { label: "Stage update", Icon: ArrowRight };
  if (t.includes("sync") || t.includes("auto")) return { label: "Auto update", Icon: RefreshCw };
  if (t.includes("link")) return { label: "Record linked", Icon: Link2 };
  if (t.includes("created")) return { label: "Record created", Icon: FilePlus2 };
  return { label: titleCaseToken((eventType ?? "UPDATE").toUpperCase()), Icon: Zap };
}

function mentionsOf(row: ActivityRow): string[] {
  const m = (row.metadata as { mentions?: unknown } | null)?.mentions;
  return Array.isArray(m) ? m.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
}

/** Render a message description with @mentions highlighted in the accent color. */
function renderWithMentions(text: string, mentions: string[]): React.ReactNode {
  if (mentions.length === 0) return text;
  // Longest names first so "@Sarah Chen-Lee" wins over "@Sarah Chen".
  const sorted = [...mentions].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((m) => `@${m}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(re);
  return parts.map((part, i) =>
    part.startsWith("@") && sorted.some((m) => `@${m}` === part) ? (
      <span key={i} style={{ color: "var(--accent-primary)", fontWeight: 600 }}>{part}</span>
    ) : (
      part
    ),
  );
}

/**
 * What-If lever panel (P6 iteration 2 follow-up). Internal staff manually tweak
 * eMod, schedule rating, and the PEO toggle and see the re-rated premium live
 * (debounced) before applying. Reuses the same apply endpoint as the AI cards.
 */
function WhatIfPanel({
  basePremium, baseLevers, varApplying, onPreviewLevers, onApplyLevers,
}: {
  basePremium: number;
  baseLevers: VariationLevers;
  varApplying: string | null;
  onPreviewLevers: (levers: VariationLevers) => Promise<PreviewVariationResponse>;
  onApplyLevers: (levers: VariationLevers, label: string) => void;
}) {
  const c = useThemeColors();
  const [levers, setLevers] = useState<VariationLevers>(baseLevers);
  const [preview, setPreview] = useState<PreviewVariationResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const reqId = useRef(0);

  const money = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const dirty =
    levers.eMod !== baseLevers.eMod ||
    levers.scheduleRating !== baseLevers.scheduleRating ||
    levers.isPEO !== baseLevers.isPEO;

  const run = useCallback(
    (next: VariationLevers) => {
      const id = ++reqId.current;
      setPreviewing(true);
      onPreviewLevers(next)
        .then((res) => {
          if (reqId.current === id) setPreview(res);
        })
        .catch(() => {
          if (reqId.current === id) setPreview(null);
        })
        .finally(() => {
          if (reqId.current === id) setPreviewing(false);
        });
    },
    [onPreviewLevers],
  );

  // Debounce preview calls while the operator drags the sliders. When the levers
  // return to base (or are reset), invalidate any in-flight request so a late
  // response can't flash a stale projected premium over the "current" state.
  useEffect(() => {
    if (!dirty) {
      reqId.current++;
      setPreview(null);
      setPreviewing(false);
      return;
    }
    const t = setTimeout(() => run(levers), 350);
    return () => clearTimeout(t);
  }, [levers, dirty, run]);

  const shownPremium = preview ? preview.premium : basePremium;
  const delta = preview ? preview.delta : 0;
  const deltaPct = preview ? preview.deltaPct : 0;
  const deltaColor = delta < 0 ? STATUS_COLORS.complete : delta > 0 ? "#ef4444" : c.textMuted;

  const sliderRow = (
    label: string,
    key: "eMod" | "scheduleRating",
  ) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: c.textSecondary }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: c.textPrimary, fontVariantNumeric: "tabular-nums" }}>
          {levers[key].toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={0.5}
        max={2.0}
        step={0.01}
        value={levers[key]}
        onChange={(e) => setLevers((p) => ({ ...p, [key]: Number(e.target.value) }))}
        style={{ width: "100%", accentColor: "var(--accent-primary)", cursor: "pointer" }}
      />
    </div>
  );

  return (
    <div style={{ marginTop: 4, paddingTop: 12, borderTop: `1px solid ${c.borderColor}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <SlidersHorizontal style={{ width: 14, height: 14, color: "var(--accent-primary)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>Manual What-If</span>
        <span style={{ fontSize: 10.5, color: c.textMuted }}>live preview \u00b7 not saved until applied</span>
      </div>

      {sliderRow("Experience mod (eMod)", "eMod")}
      {sliderRow("Schedule rating", "scheduleRating")}

      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <span style={{ fontSize: 11, color: c.textSecondary }}>PEO placement</span>
        <button
          type="button"
          role="switch"
          aria-checked={levers.isPEO}
          onClick={() => setLevers((p) => ({ ...p, isPEO: !p.isPEO }))}
          style={{
            position: "relative", width: 38, height: 21, borderRadius: 9999, border: "none", cursor: "pointer",
            background: levers.isPEO ? "var(--accent-primary)" : c.borderColor, transition: "background 0.15s ease", padding: 0,
          }}
        >
          <span style={{ position: "absolute", top: 2, left: levers.isPEO ? 19 : 2, width: 17, height: 17, borderRadius: "50%", background: "#fff", transition: "left 0.15s ease", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
        </button>
      </label>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 8, padding: "9px 10px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, color: c.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {previewing ? "Calculating\u2026" : dirty ? "Projected WC premium" : "Current WC premium"}
          </span>
          {dirty && preview && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: deltaColor }}>
              {delta > 0 ? "+" : ""}{money(delta)} ({deltaPct > 0 ? "+" : ""}{deltaPct}%)
            </span>
          )}
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, opacity: previewing ? 0.5 : 1, fontVariantNumeric: "tabular-nums" }}>
          {money(shownPremium)}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => onApplyLevers(levers, "Manual what-if")}
          disabled={!dirty || previewing || varApplying !== null}
          style={{
            fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--gradient-cta)", border: "none", borderRadius: 8,
            padding: "7px 16px", cursor: !dirty || previewing || varApplying !== null ? "default" : "pointer", fontFamily: "inherit",
            opacity: !dirty || previewing || varApplying !== null ? 0.5 : 1,
          }}
        >
          {varApplying === "what-if" ? "Applying\u2026" : "Apply to quote"}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => { setLevers(baseLevers); setPreview(null); }}
            disabled={varApplying !== null}
            style={{ fontSize: 11, color: c.textSecondary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, letterSpacing: "0.04em", padding: 0 }}
          >
            RESET
          </button>
        )}
      </div>
    </div>
  );
}

export default function OverviewTab({
  activity, canPost, posting, onSend, directory, rfis, isInternal, rfiBusy, onCreateRfi, onResolveRfi,
  variations, basePremium, baseLevers, varHasQuote, varUsedAi, varLoading, varApplying,
  onGenerateVariations, onApplyVariation, onPreviewLevers, onApplyLevers,
}: OverviewTabProps) {
  const c = useThemeColors();
  const authUser = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pickedMentions, setPickedMentions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const [compare, setCompare] = useState<QuoteVariation | null>(null);
  const [generated, setGenerated] = useState(false);

  const runGenerate = () => {
    setGenerated(true);
    onGenerateVariations();
  };

  const money = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const leverList = (v: QuoteVariation) => {
    const parts: string[] = [];
    parts.push(`eMod ${v.changes.eMod.toFixed(2)}`);
    parts.push(`Sched ${v.changes.scheduleRating.toFixed(2)}`);
    parts.push(v.changes.isPEO ? "PEO" : "No PEO");
    return parts.join(" \u00b7 ");
  };

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

  // Directory keyed by id for feed avatar lookups.
  const membersById = useMemo(() => {
    const m = new Map<string, DealDirectoryEntry>();
    for (const member of directory) m.set(member.id, member);
    return m;
  }, [directory]);

  // @mention autocomplete — candidates matching the token after the trailing "@".
  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return directory.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [directory, mentionQuery]);

  /** Track "@partialname" being typed at the end of the input. */
  const handleTextChange = (value: string) => {
    setText(value);
    const match = /(?:^|\s)@([\w'.-]{0,40}(?: [\w'.-]{0,40})?)$/.exec(value);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const pickMention = (m: DealDirectoryEntry) => {
    setText((prev) => prev.replace(/@([\w'.-]{0,40}(?: [\w'.-]{0,40})?)$/, `@${m.name} `));
    setPickedMentions((prev) => (prev.includes(m.name) ? prev : [...prev, m.name]));
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const submit = () => {
    const t = text.trim();
    if (!t || posting) return;
    // Only send mentions still present in the final text.
    onSend(t, pickedMentions.filter((name) => t.includes(`@${name}`)));
    setText("");
    setPickedMentions([]);
    setMentionQuery(null);
  };

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
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Real activity feed grouped by day */}
        {groups.length === 0 && (
          <div style={{ fontSize: 12, color: c.textMuted }}>No activity yet.</div>
        )}
        {groups.map(([day, rows]) => (
          <div key={day} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span style={dayPill}>{day}</span>
            </div>
            {rows.map((row) => {
              const rawAuthor = authorOf(row);
              const isSystem = !row.createdBy && rawAuthor === "System";
              const sys = isSystem ? systemEventMeta(row.eventType) : null;
              const author = sys ? sys.label : rawAuthor;
              const role = isSystem ? null : roleOf(row);
              const photo = row.createdBy ? (membersById.get(row.createdBy)?.avatarUrl ?? null) : null;
              const isUserText = row.eventType === "message" || row.eventType === "NOTE";
              const description = row.description ?? "";
              const displayText = isUserText ? description : prettifyTokens(description);
              const avatarCircle = (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: c.hoverBg, color: c.textSecondary, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {sys ? (
                    <sys.Icon style={{ width: 12, height: 12 }} />
                  ) : photo ? (
                    <img src={photo} alt={author} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    initials(author)
                  )}
                </div>
              );
              return (
                <div key={row.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    {row.createdBy ? (
                      <UserMiniProfile userId={row.createdBy}>
                        <button
                          type="button"
                          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                        >
                          {avatarCircle}
                          <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>{author}</span>
                        </button>
                      </UserMiniProfile>
                    ) : (
                      <>
                        {avatarCircle}
                        <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>{author}</span>
                      </>
                    )}
                    {role && <span style={{ fontSize: 10.5, color: c.textMuted }}>{role}</span>}
                    <span style={{ fontSize: 10, color: c.textMuted }}>{"\u00b7"} {timeLabel(row.createdAt)}</span>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 12, color: c.textSecondary, lineHeight: 1.55 }}>
                      {renderWithMentions(displayText, mentionsOf(row))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* AI quote-variation — live (P6 iteration 2), internal staff only.
            Temporarily hidden from deal cards (feature saved for later) — flip
            SHOW_AI_QUOTE_VARIATIONS to true to restore; all wiring stays intact. */}
        {SHOW_AI_QUOTE_VARIATIONS && isInternal && (
          <div>
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Sparkles style={{ width: 15, height: 15, color: c.accentSupport, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>AI Quote Variations</span>
                  {generated && varHasQuote && variations.length > 0 && (
                    <span style={{ fontSize: 10, color: c.accentSupport, background: "var(--accent-support-soft)", borderRadius: 9999, padding: "1px 7px", whiteSpace: "nowrap" }}>
                      {varUsedAi ? "AI" : "Heuristic"}
                    </span>
                  )}
                </div>
                {!varLoading && (
                  <button
                    onClick={runGenerate}
                    style={{ fontSize: 11, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, letterSpacing: "0.04em", padding: 0 }}
                  >
                    {generated ? "REGENERATE" : "GENERATE"}
                  </button>
                )}
              </div>

              {!generated && (
                <div style={{ fontSize: 11.5, color: c.textMuted, lineHeight: 1.5 }}>
                  Let the AI engine propose alternative pricing scenarios from this deal's quote
                  by adjusting experience mod, schedule rating, and PEO placement.
                </div>
              )}

              {generated && varLoading && (
                <div style={{ fontSize: 12, color: c.textMuted }}>Generating variations\u2026</div>
              )}

              {generated && !varLoading && !varHasQuote && (
                <div style={{ fontSize: 11.5, color: c.textMuted, lineHeight: 1.5 }}>
                  This deal has no rated quote yet. Run a quote from the Quote tab first, then
                  generate variations here.
                </div>
              )}

              {generated && !varLoading && varHasQuote && variations.length === 0 && (
                <div style={{ fontSize: 11.5, color: c.textMuted, lineHeight: 1.5 }}>
                  No alternative scenarios were proposed for this deal.
                </div>
              )}

              {generated && !varLoading && varHasQuote && variations.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 11, color: c.textMuted }}>
                    <span>Current WC premium</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>{money(basePremium)}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {variations.map((v) => {
                      const down = v.delta < 0;
                      const deltaColor = down ? STATUS_COLORS.complete : v.delta > 0 ? "#ef4444" : c.textMuted;
                      return (
                        <div key={v.id} style={{ background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 8, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>{v.label}</span>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: c.textPrimary }}>{money(v.premium)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: deltaColor, background: c.hoverBg, borderRadius: 9999, padding: "1px 8px" }}>
                              {v.delta > 0 ? "+" : ""}{money(v.delta)} ({v.deltaPct > 0 ? "+" : ""}{v.deltaPct}%)
                            </span>
                            <span style={{ fontSize: 10, color: c.textMuted }}>{leverList(v)}</span>
                          </div>
                          <div style={{ fontSize: 11, color: c.textSecondary, lineHeight: 1.5 }}>{v.rationale}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 2 }}>
                            <button
                              onClick={() => setCompare(v)}
                              style={{ fontSize: 10.5, color: c.textSecondary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, letterSpacing: "0.04em", padding: 0 }}
                            >
                              COMPARE
                            </button>
                            <button
                              onClick={() => onApplyVariation(v)}
                              disabled={varApplying !== null}
                              style={{ fontSize: 10.5, color: "var(--accent-primary)", background: "none", border: "none", cursor: varApplying !== null ? "default" : "pointer", fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.04em", padding: 0, opacity: varApplying !== null ? 0.6 : 1 }}
                            >
                              {varApplying === v.id ? "APPLYING\u2026" : "APPLY"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {generated && !varLoading && varHasQuote && baseLevers && (
                <WhatIfPanel
                  basePremium={basePremium}
                  baseLevers={baseLevers}
                  varApplying={varApplying}
                  onPreviewLevers={onPreviewLevers}
                  onApplyLevers={onApplyLevers}
                />
              )}
            </div>
          </div>
        )}

        {/* RFIs — live (P6 iteration 1) */}
        {(openRfis.length > 0 || closedRfis.length > 0 || isInternal) && (
          <div>
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
                    style={{ fontSize: 11.5, borderRadius: 8, padding: "6px 12px", cursor: rfiSubject.trim() ? "pointer" : "not-allowed", color: "#fff", background: "var(--gradient-cta)", border: "none", fontWeight: 600, fontFamily: "inherit", opacity: rfiSubject.trim() ? 1 : 0.5 }}
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
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#fff", background: "var(--gradient-cta)", border: "none", fontWeight: 500, fontFamily: "inherit" }}
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

      {/* Sticky composer — sender avatar · "Type a message" · arrow send */}
      {canPost && (
        <div style={{ position: "sticky", bottom: 0, marginTop: 4, background: c.bg, padding: "8px 0 2px", boxShadow: `0 -12px 12px -6px ${c.bg}` }}>
          {/* @mention autocomplete dropdown */}
          {mentionQuery !== null && mentionCandidates.length > 0 && (
            <div
              style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, zIndex: 30,
                background: "rgba(18,18,24,0.82)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
                border: `1px solid ${c.borderColor}`, borderRadius: 10,
                boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
                padding: 4, maxHeight: 220, overflowY: "auto",
              }}
            >
              {mentionCandidates.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickMention(m); }}
                  onMouseEnter={() => setMentionIndex(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                    background: i === mentionIndex ? "var(--accent-primary-soft)" : "none",
                    border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: c.hoverBg, color: c.textSecondary, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      initials(m.name)
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{m.name}</span>
                </button>
              ))}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: c.inputBg,
              border: `1px solid ${c.borderColor}`,
              borderRadius: 10,
              padding: "6px 8px 6px 8px",
            }}
          >
            {/* Sender avatar */}
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: c.hoverBg, color: c.textSecondary, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {authUser?.avatarUrl ? (
                <img src={authUser.avatarUrl} alt="You" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                initials(authUser ? `${authUser.firstName} ${authUser.lastName}`.trim() || authUser.email : "?")
              )}
            </div>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (mentionQuery !== null && mentionCandidates.length > 0) {
                  if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionCandidates.length); return; }
                  if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length); return; }
                  if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pickMention(mentionCandidates[mentionIndex]); return; }
                  if (e.key === "Escape") { e.preventDefault(); setMentionQuery(null); return; }
                }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
              onBlur={() => setMentionQuery(null)}
              placeholder="Type a message"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: c.inputText, fontFamily: "inherit" }}
            />
            <button
              onClick={submit}
              disabled={posting || !text.trim()}
              aria-label="Send message"
              style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--gradient-cta)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "none", cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() ? 1 : 0.5, flexShrink: 0 }}
            >
              <ArrowUp style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>
      )}

      {/* Compare overlay — current quote vs. selected variation */}
      {compare && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setCompare(null); }}
          style={{ position: "fixed", inset: 0, background: "var(--overlay-bg)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }}
        >
          <div
            style={{
              width: "100%", maxWidth: 560,
              background: "rgba(18,18,24,0.82)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
              color: c.textPrimary, border: `1px solid ${c.borderColor}`, borderRadius: 16,
              boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
              padding: 20, fontFamily: "var(--app-font-sans)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles style={{ width: 16, height: 16, color: c.accentSupport }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Compare — {compare.label}</span>
              </div>
              <X onClick={() => setCompare(null)} style={{ width: 18, height: 18, color: c.textMuted, cursor: "pointer" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
              {/* Current */}
              <div style={{ background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: c.textMuted, marginBottom: 6 }}>Current</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{money(basePremium)}</div>
                <div style={{ fontSize: 11, color: c.textSecondary, lineHeight: 1.7 }}>
                  Standard rating with the deal's current levers.
                </div>
              </div>

              <ArrowRight style={{ width: 18, height: 18, color: c.textMuted }} />

              {/* Variation */}
              <div style={{ background: c.cardBg, border: `1px solid var(--accent-support)`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: c.accentSupport, marginBottom: 6 }}>{compare.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{money(compare.premium)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: compare.delta < 0 ? STATUS_COLORS.complete : compare.delta > 0 ? "#ef4444" : c.textMuted, marginBottom: 8 }}>
                  {compare.delta > 0 ? "+" : ""}{money(compare.delta)} ({compare.deltaPct > 0 ? "+" : ""}{compare.deltaPct}%)
                </div>
                <div style={{ fontSize: 11, color: c.textSecondary, lineHeight: 1.7 }}>{leverList(compare)}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: c.textSecondary, lineHeight: 1.55, marginTop: 14, marginBottom: 16 }}>{compare.rationale}</div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setCompare(null)}
                style={{ fontSize: 12, color: c.textSecondary, background: "none", border: `1px solid ${c.borderColor}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}
              >
                Close
              </button>
              <button
                onClick={() => { const v = compare; setCompare(null); onApplyVariation(v); }}
                disabled={varApplying !== null}
                style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--gradient-cta)", border: "none", borderRadius: 8, padding: "7px 16px", cursor: varApplying !== null ? "default" : "pointer", fontFamily: "inherit", opacity: varApplying !== null ? 0.6 : 1 }}
              >
                {varApplying === compare.id ? "Applying\u2026" : "Apply this variation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
