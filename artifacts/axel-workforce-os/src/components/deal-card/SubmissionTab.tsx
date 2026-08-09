/**
 * Submission tab — accordion card design.
 * Visual: a single rounded outer card containing all sections as accordion rows.
 * Each row: [Icon] Section name · · · [dot] [status] [pencil] [chevron]
 * Expanded: 3-column read-only label/value grid; pencil switches to edit mode
 * with the existing wizard-form inputs.
 *
 * All behaviour preserved from the prior version:
 *   - Per-section pencil edit mode, Save / Discard
 *   - Dirty sections stay open and skip the collapse toggle
 *   - focusRequest deep-link from header KPI tiles (scroll + highlight)
 *   - canRequestProposal / Submit for Proposal CTA
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import type { SectionFieldView, SectionView } from "./types";
import { sectionIcon, STATUS_COLORS } from "./icons";
import { useThemeColors } from "@/lib/use-theme-colors";
import {
  FieldGrid,
  FieldLabel,
  TextInput,
  NumberInput,
  CurrencyInput,
  SelectInput,
  MultiSelect,
  YesNoToggle,
  US_STATES_OPTIONS,
} from "@/components/quote-flow/FormFields";

interface SubmissionTabProps {
  sections: SectionView[];
  aggregateComplete: number;
  total: number;
  /** Server-computed per-section edit access (payload.access). */
  access: Record<string, boolean>;
  /** Key of the section currently saving, or null. */
  savingSection: string | null;
  /** Persist changed fields for one section; resolves true on success. */
  onSaveSection: (sectionKey: string, fields: Record<string, unknown>) => Promise<boolean>;
  /** Whether the actor may submit this deal for proposal (internal sales roles). */
  canRequestProposal?: boolean;
  /** Deal's current proposalStatus (null when no proposal exists yet). */
  proposalStatus?: string | null;
  /** Submit the completed submission for proposal; resolves true on success. */
  onRequestProposal?: () => Promise<boolean>;
  /**
   * Scroll-to-section request from a header KPI click. `token` changes on
   * every call so repeat clicks on the same KPI retrigger the scroll.
   */
  focusRequest?: { section: string; field?: string; token: number } | null;
}

/** Canonical string form of a field value for draft comparison / editing. */
function inputValue(f: SectionFieldView): string {
  if (f.value == null) return "";
  if (f.type === "array") return Array.isArray(f.value) ? f.value.join(",") : String(f.value);
  if (f.type === "boolean") return f.value ? "true" : "false";
  return String(f.value);
}

function displayValue(f: SectionFieldView): string {
  if (f.value == null || f.value === "") return "\u2014";
  if (f.type === "boolean") return f.value ? "Yes" : "No";
  if (f.type === "array") return Array.isArray(f.value) ? f.value.join(", ") : String(f.value);
  return String(f.value);
}

/** Number fields that are dollar amounts. */
const CURRENCY_KEYS = new Set(["annualPayroll", "annualRevenue"]);
const STATE_ARRAY_KEYS = new Set(["statesOfOperation"]);
const STATE_SELECT_KEYS = new Set(["state"]);

export default function SubmissionTab({
  sections,
  aggregateComplete,
  total,
  access,
  savingSection,
  onSaveSection,
  canRequestProposal = false,
  proposalStatus,
  onRequestProposal,
  focusRequest,
}: SubmissionTabProps) {
  const c = useThemeColors();
  const pct = total > 0 ? Math.round((aggregateComplete / total) * 100) : 0;

  const allComplete = total > 0 && aggregateComplete >= total;
  const alreadyRequested =
    proposalStatus === "approved_proposal_requested" ||
    proposalStatus === "underwriting_notified";
  const [proposalBusy, setProposalBusy] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  const handleRequestProposal = async () => {
    if (!onRequestProposal || proposalBusy) return;
    setProposalBusy(true);
    setProposalError(null);
    try {
      const ok = await onRequestProposal();
      if (!ok) setProposalError("Could not submit for proposal. Try again.");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      setProposalError(raw ? raw.replace(/^"|"$/g, "") : "Could not submit for proposal. Try again.");
    } finally {
      setProposalBusy(false);
    }
  };

  // Drafts hold only touched fields, keyed "<sectionKey>.<fieldKey>".
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Collapsed section keys — all start expanded.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Per-section read-only → edit-mode toggle.
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const setEditingFor = (sKey: string, on: boolean) =>
    setEditing((prev) => {
      const next = new Set(prev);
      if (on) next.add(sKey); else next.delete(sKey);
      return next;
    });

  const toggleCollapsed = (sKey: string, dirty: boolean) => {
    if (dirty) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(sKey)) next.delete(sKey); else next.add(sKey);
      return next;
    });
  };

  // Header KPI deep-link: expand target, scroll to it, briefly highlight the field.
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightField, setHighlightField] = useState<string | null>(null);
  useEffect(() => {
    if (!focusRequest) return;
    setCollapsed((prev) => {
      if (!prev.has(focusRequest.section)) return prev;
      const next = new Set(prev);
      next.delete(focusRequest.section);
      return next;
    });
    const t = setTimeout(() => {
      sectionRefs.current[focusRequest.section]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    let clear: ReturnType<typeof setTimeout> | undefined;
    if (focusRequest.field) {
      setHighlightField(`${focusRequest.section}.${focusRequest.field}`);
      clear = setTimeout(() => setHighlightField(null), 2200);
    }
    return () => { clearTimeout(t); if (clear) clearTimeout(clear); };
  }, [focusRequest]);

  const draftKey = (s: string, f: string) => `${s}.${f}`;
  const valueFor = (sKey: string, f: SectionFieldView) =>
    drafts[draftKey(sKey, f.key)] ?? inputValue(f);
  const setValue = (sKey: string, fKey: string, v: string) =>
    setDrafts((d) => ({ ...d, [draftKey(sKey, fKey)]: v }));

  const changedFields = (section: SectionView): Record<string, unknown> => {
    const changed: Record<string, unknown> = {};
    for (const f of section.fields) {
      if (f.readOnly) continue;
      const k = draftKey(section.key, f.key);
      if (!(k in drafts)) continue;
      const raw = drafts[k];
      if (raw === inputValue(f)) continue;
      if (f.type === "number") changed[f.key] = raw === "" ? null : Number(raw);
      else if (f.type === "boolean") changed[f.key] = raw === "true";
      else if (f.type === "array") changed[f.key] = raw.split(",").map((s) => s.trim()).filter(Boolean);
      else changed[f.key] = raw;
    }
    return changed;
  };

  const discardSection = (sKey: string) => {
    setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith(`${sKey}.`))));
    setEditingFor(sKey, false);
  };

  const handleSave = async (section: SectionView) => {
    const fields = changedFields(section);
    if (Object.keys(fields).length === 0) { discardSection(section.key); return; }
    const submitted: Record<string, string> = {};
    for (const fKey of Object.keys(fields))
      submitted[draftKey(section.key, fKey)] = drafts[draftKey(section.key, fKey)];
    const ok = await onSaveSection(section.key, fields);
    if (ok) {
      setDrafts((d) =>
        Object.fromEntries(Object.entries(d).filter(([k, v]) => !(k in submitted && submitted[k] === v))),
      );
      setEditingFor(section.key, false);
    }
  };

  const fieldInput = (sKey: string, f: SectionFieldView, disabled: boolean) => {
    const v = valueFor(sKey, f);
    if (f.readOnly) {
      return (
        <div style={{ padding: "12px 14px", borderRadius: 10, border: `1px dashed ${c.borderColor}`, fontSize: 14, color: c.textMuted }}>
          {displayValue(f)}
        </div>
      );
    }
    if (f.type === "boolean") {
      return (
        <YesNoToggle
          value={v === "true" ? "Yes" : v === "false" ? "No" : ""}
          onChange={(opt) => setValue(sKey, f.key, opt === "Yes" ? "true" : "false")}
          disabled={disabled}
        />
      );
    }
    if (f.type === "array" && STATE_ARRAY_KEYS.has(f.key)) {
      return (
        <MultiSelect
          values={v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []}
          onChange={(vals) => setValue(sKey, f.key, vals.join(","))}
          options={US_STATES_OPTIONS}
          placeholder="Select states"
          disabled={disabled}
        />
      );
    }
    if (STATE_SELECT_KEYS.has(f.key)) {
      return (
        <SelectInput
          value={v}
          onChange={(val) => setValue(sKey, f.key, val)}
          options={US_STATES_OPTIONS}
          placeholder="Select state"
          disabled={disabled}
        />
      );
    }
    if (f.type === "number") {
      if (CURRENCY_KEYS.has(f.key)) {
        return (
          <CurrencyInput
            value={v ? Number(String(v).replace(/[^\d]/g, "")).toLocaleString("en-US") : ""}
            onChange={(val) => setValue(sKey, f.key, val.replace(/[^\d]/g, ""))}
            disabled={disabled}
          />
        );
      }
      return <NumberInput value={v} onChange={(val) => setValue(sKey, f.key, val)} disabled={disabled} />;
    }
    return (
      <TextInput
        value={v}
        onChange={(val) => setValue(sKey, f.key, val)}
        type={f.type === "date" ? "date" : "text"}
        disabled={disabled}
        placeholder={f.type === "array" ? "Comma-separated" : undefined}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Completeness + Submit CTA ───────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-heading" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: c.sectionHeading }}>
            Submission Completeness
          </span>
          <span style={{ fontSize: 11, color: c.textMuted, fontWeight: 500 }}>
            {aggregateComplete} / {total} complete
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 9999, background: c.cardBg, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-primary)", transition: "width 0.3s" }} />
        </div>

        {canRequestProposal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {alreadyRequested ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: `1px solid ${c.borderColor}`, background: c.cardBg, fontSize: 12.5, color: c.textSecondary }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLORS.complete, display: "inline-block" }} />
                {proposalStatus === "underwriting_notified"
                  ? "Submitted for proposal — underwriting has been notified."
                  : "Submitted for proposal — underwriting package is being prepared."}
              </div>
            ) : (
              <>
                <button
                  onClick={() => void handleRequestProposal()}
                  disabled={!allComplete || proposalBusy}
                  title={allComplete ? undefined : `Complete all ${total} sections to submit for proposal`}
                  style={{ width: "100%", textAlign: "center", fontSize: 13, borderRadius: 8, padding: "10px 12px", fontWeight: 600, color: "#fff", background: "var(--gradient-cta)", border: "none", fontFamily: "inherit", opacity: allComplete && !proposalBusy ? 1 : 0.5, cursor: allComplete && !proposalBusy ? "pointer" : "not-allowed" }}
                >
                  {proposalBusy ? "Submitting\u2026" : "Submit for Proposal"}
                </button>
                {!allComplete && (
                  <div style={{ fontSize: 11, color: c.textMuted }}>
                    Complete the remaining {total - aggregateComplete} section{total - aggregateComplete === 1 ? "" : "s"} below to submit for proposal.
                  </div>
                )}
                {proposalError && <div style={{ fontSize: 11, color: "#ef4444", lineHeight: 1.45 }}>{proposalError}</div>}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Accordion card ─────────────────────────────────────────────── */}
      <div style={{ borderRadius: 14, border: `1px solid ${c.borderColor}`, overflow: "hidden", background: c.cardBg }}>
        {sections.map((s, i) => {
          const Icon = sectionIcon(s.icon);
          const canEdit = !!access[s.key];
          const dirty = Object.keys(changedFields(s)).length > 0;
          const saving = savingSection === s.key;
          const inputsDisabled = !canEdit || saving;
          const saveBlocked = savingSection !== null;
          const isEditing = editing.has(s.key) || dirty;
          const isCollapsed = collapsed.has(s.key) && !dirty;

          // Status dot colour
          const dotColor =
            s.status === "complete" ? STATUS_COLORS.complete
            : s.status === "partial" ? STATUS_COLORS.partial
            : STATUS_COLORS.not_started;

          const statusText =
            s.status === "complete" ? "Complete"
            : s.status === "partial" ? `${s.missing} missing`
            : "Not started";

          return (
            <div
              key={s.key}
              ref={(el) => { sectionRefs.current[s.key] = el; }}
              style={{ borderTop: i === 0 ? "none" : `1px solid ${c.borderColor}`, scrollMarginTop: 12 }}
            >
              {/* Row header */}
              <div
                onClick={() => toggleCollapsed(s.key, dirty)}
                role="button"
                aria-expanded={!isCollapsed}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "15px 20px",
                  cursor: dirty ? "default" : "pointer",
                  userSelect: "none",
                  background: !isCollapsed ? "rgba(255,255,255,0.02)" : "transparent",
                  transition: "background 120ms ease",
                }}
              >
                {/* Section icon — accent when open, muted when collapsed */}
                <Icon style={{ width: 16, height: 16, flexShrink: 0, color: !isCollapsed ? "var(--accent-primary)" : c.textMuted }} />

                {/* Section name */}
                <span style={{ fontSize: 14.5, fontWeight: 700, color: c.textPrimary, flex: 1 }}>
                  {s.label}
                </span>

                {/* View-only badge */}
                {!canEdit && (
                  <span style={{ fontSize: 10, color: c.textMuted, border: `1px solid ${c.borderColor}`, borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                    View only
                  </span>
                )}

                {/* Status dot */}
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, boxShadow: `0 0 8px ${dotColor}66`, flexShrink: 0 }} />

                {/* Status text */}
                <span style={{ fontSize: 11, color: c.textMuted, width: 78, flexShrink: 0 }}>
                  {statusText}
                </span>

                {/* Pencil — only when can edit and section is open */}
                {canEdit && !isCollapsed && (
                  <button
                    type="button"
                    data-testid={`button-edit-${s.key}`}
                    title={isEditing ? "Done editing" : `Edit ${s.label}`}
                    aria-label={isEditing ? "Done editing" : `Edit ${s.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEditing) { if (!dirty) setEditingFor(s.key, false); }
                      else setEditingFor(s.key, true);
                    }}
                    style={{
                      background: isEditing ? "var(--accent-primary)" : "none",
                      border: `1px solid ${isEditing ? "var(--accent-primary)" : c.borderColor}`,
                      borderRadius: 7, padding: 5, cursor: "pointer",
                      display: "flex", alignItems: "center", flexShrink: 0,
                    }}
                  >
                    <Pencil style={{ width: 12, height: 12, color: isEditing ? "#fff" : c.textMuted }} />
                  </button>
                )}

                {/* Chevron */}
                <ChevronDown style={{ width: 16, height: 16, color: c.textMuted, flexShrink: 0, transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }} />
              </div>

              {/* Expanded content */}
              {!isCollapsed && (
                <div style={{ padding: "2px 20px 20px 48px" }}>
                  {isEditing ? (
                    /* Edit mode — wizard form inputs, 2-column */
                    <FieldGrid columns={2}>
                      {s.fields.map((f) => (
                        <div
                          key={f.key}
                          style={
                            highlightField === `${s.key}.${f.key}`
                              ? { borderRadius: 10, boxShadow: "0 0 0 2px var(--accent-primary)", transition: "box-shadow 0.3s", padding: 2, margin: -2 }
                              : { padding: 2, margin: -2, borderRadius: 10, transition: "box-shadow 0.6s" }
                          }
                        >
                          <FieldLabel label={f.ratingRelevant ? `${f.label} · rating` : f.label} required={f.required}>
                            {fieldInput(s.key, f, inputsDisabled)}
                          </FieldLabel>
                        </div>
                      ))}
                    </FieldGrid>
                  ) : (
                    /* Read-only mode — 3-column label/value grid */
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 24px" }}>
                      {s.fields.map((f) => (
                        <div
                          key={f.key}
                          style={
                            highlightField === `${s.key}.${f.key}`
                              ? { borderRadius: 10, boxShadow: "0 0 0 2px var(--accent-primary)", transition: "box-shadow 0.3s", padding: "4px 6px", margin: "-4px -6px" }
                              : { padding: "4px 6px", margin: "-4px -6px", borderRadius: 10, transition: "box-shadow 0.6s" }
                          }
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, color: c.textMuted }}>
                              {f.label}
                              {f.required && <span style={{ color: "var(--accent-primary)", marginLeft: 3 }}>*</span>}
                            </span>
                            <span style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 500, overflowWrap: "anywhere", color: f.value == null || f.value === "" ? c.textMuted : c.textPrimary }}>
                              {displayValue(f)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Save / Discard — only shown when section has unsaved edits */}
                  {dirty && canEdit && (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                      <button
                        onClick={() => discardSection(s.key)}
                        disabled={saveBlocked}
                        style={{ fontFamily: "inherit", fontSize: 12, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: c.textSecondary, background: "none", border: `1px solid ${c.borderColor}` }}
                      >
                        Discard
                      </button>
                      <button
                        onClick={() => void handleSave(s)}
                        disabled={saveBlocked}
                        style={{ fontFamily: "inherit", fontSize: 12, borderRadius: 8, padding: "7px 14px", cursor: saving ? "wait" : "pointer", opacity: saveBlocked && !saving ? 0.5 : 1, color: "#fff", background: "var(--gradient-cta)", fontWeight: 500, border: "none" }}
                      >
                        {saving ? "Saving\u2026" : "Save changes"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
