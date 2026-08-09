/**
 * Phase 4C — Submission tab, inline wizard-style form.
 * Replaces the previous section-card + overlay-editor pattern: every section
 * renders its fields directly on the tab as editable form inputs (quote-wizard
 * styling via the shared FormFields components), split into the same sections
 * as before. Edits are tracked per section; a Save/Discard row appears once a
 * section has changes. Edit access stays server-gated (spec §8) — fields in
 * sections the viewer can't edit (and readOnly/computed fields) are disabled.
 * Completeness still comes straight from the server payload.
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
   * Scroll-to-section request (e.g. from a header KPI click). `token` changes
   * on every request so repeat clicks on the same KPI still retrigger.
   */
  focusRequest?: { section: string; field?: string; token: number } | null;
}

/** Canonical string form of a field value for draft comparison/editing. */
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

function StatusChip({ section }: { section: SectionView }) {
  const c = useThemeColors();
  const dot = (bg: string) => (
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: bg, display: "inline-block" }} />
  );
  return (
    <span style={{ fontSize: 11, color: c.textMuted, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      {section.status === "complete" && <>{dot(STATUS_COLORS.complete)}Complete</>}
      {section.status === "partial" && <>{dot(STATUS_COLORS.partial)}{section.missing} missing</>}
      {section.status === "not_started" && <>{dot(STATUS_COLORS.not_started)}Not started</>}
    </span>
  );
}

/** Field keys rendered with the wizard's state multi-select. */
const STATE_ARRAY_KEYS = new Set(["statesOfOperation"]);
/** Number fields that are dollar amounts — rendered with a $ prefix + thousands separators. */
const CURRENCY_KEYS = new Set(["annualPayroll", "annualRevenue"]);
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

  // "Submit for Proposal" CTA state. The button unlocks only when every
  // section's required fields are complete; the server enforces the same gate.
  const allComplete = total > 0 && aggregateComplete >= total;
  const alreadyRequested = proposalStatus === "approved_proposal_requested" || proposalStatus === "underwriting_notified";
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
      // api.ts JSON-stringifies server error bodies — strip the quotes for display.
      const raw = e instanceof Error ? e.message : "";
      setProposalError(raw ? raw.replace(/^"|"$/g, "") : "Could not submit for proposal. Try again.");
    } finally {
      setProposalBusy(false);
    }
  };

  // Drafts hold ONLY touched fields, keyed "<sectionKey>.<fieldKey>". Values
  // for untouched fields always come from the server payload, so a successful
  // save (which refreshes `sections`) just needs the section's drafts cleared.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Collapsed section keys. All sections start expanded; a section with
  // unsaved edits cannot be collapsed (so dirty state is never hidden).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Sections are read-only by default — a static snapshot of the client's
  // details. The pencil per section switches it into edit mode (reduces
  // accidental edits); saving or discarding drops back to read-only.
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const setEditingFor = (sKey: string, on: boolean) =>
    setEditing((prev) => {
      const next = new Set(prev);
      if (on) next.add(sKey);
      else next.delete(sKey);
      return next;
    });
  const toggleCollapsed = (sKey: string, dirty: boolean) => {
    if (dirty) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(sKey)) next.delete(sKey);
      else next.add(sKey);
      return next;
    });
  };

  // Header-KPI deep link: expand the target section, scroll it into view, and
  // briefly highlight the specific field so the eye lands on the right spot.
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
    // Scroll after the section has expanded/rendered.
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
    setEditingFor(sKey, false); // back to the static snapshot
  };

  const handleSave = async (section: SectionView) => {
    const fields = changedFields(section);
    if (Object.keys(fields).length === 0) {
      discardSection(section.key);
      return;
    }
    // Snapshot the submitted draft entries; on success clear only those whose
    // draft value is unchanged since submission (inputs are locked during the
    // save, so this is belt-and-braces against races).
    const submitted: Record<string, string> = {};
    for (const fKey of Object.keys(fields)) submitted[draftKey(section.key, fKey)] = drafts[draftKey(section.key, fKey)];
    const ok = await onSaveSection(section.key, fields);
    if (ok) {
      setDrafts((d) =>
        Object.fromEntries(Object.entries(d).filter(([k, v]) => !(k in submitted && submitted[k] === v))),
      );
      setEditingFor(section.key, false); // saved — back to the static snapshot
    }
  };

  const fieldInput = (sKey: string, f: SectionFieldView, disabled: boolean) => {
    const v = valueFor(sKey, f);
    if (f.readOnly) {
      // Derived/managed elsewhere — shown, never editable (matches prior overlay).
      return (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: `1px dashed ${c.borderColor}`,
            fontSize: 14,
            color: c.textMuted,
          }}
        >
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
      // Dollar-amount fields get thousands-separator formatting while typing;
      // the draft keeps raw digits so the save payload stays numeric.
      if (CURRENCY_KEYS.has(f.key)) {
        return (
          <CurrencyInput
            value={v ? Number(String(v).replace(/[^\d]/g, "")).toLocaleString("en-US") : ""}
            onChange={(val) => setValue(sKey, f.key, val.replace(/[^\d]/g, ""))}
            disabled={disabled}
          />
        );
      }
      return (
        <NumberInput value={v} onChange={(val) => setValue(sKey, f.key, val)} disabled={disabled} />
      );
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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Aggregate completeness (relocated from the rail per §8 Stitch update) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-heading" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: c.sectionHeading }}>
            Submission Completeness
          </span>
          <span style={{ fontSize: 11, color: c.textMuted, fontWeight: 500 }}>{aggregateComplete} / {total} complete</span>
        </div>
        <div style={{ height: 6, borderRadius: 9999, background: c.cardBg, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-primary)", transition: "width 0.3s" }} />
        </div>

        {canRequestProposal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {alreadyRequested ? (
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8,
                  border: `1px solid ${c.borderColor}`, background: c.cardBg, fontSize: 12.5, color: c.textSecondary,
                }}
              >
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
                  style={{
                    width: "100%", textAlign: "center", fontSize: 13, borderRadius: 8, padding: "10px 12px",
                    fontWeight: 600, color: "#fff", background: "var(--gradient-cta)", border: "none",
                    fontFamily: "inherit", opacity: allComplete && !proposalBusy ? 1 : 0.5,
                    cursor: allComplete && !proposalBusy ? "pointer" : "not-allowed",
                  }}
                >
                  {proposalBusy ? "Submitting\u2026" : "Submit for Proposal"}
                </button>
                {!allComplete && (
                  <div style={{ fontSize: 11, color: c.textMuted }}>
                    Complete the remaining {total - aggregateComplete} section{total - aggregateComplete === 1 ? "" : "s"} below to submit for proposal.
                  </div>
                )}
                {proposalError && (
                  <div style={{ fontSize: 11, color: "#ef4444", lineHeight: 1.45 }}>{proposalError}</div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {sections.map((s) => {
        const Icon = sectionIcon(s.icon);
        const canEdit = !!access[s.key];
        const dirty = Object.keys(changedFields(s)).length > 0;
        const saving = savingSection === s.key;
        // Lock inputs while this section saves; block starting a second save
        // anywhere while any save is in flight (single savingSection slot).
        const inputsDisabled = !canEdit || saving;
        const saveBlocked = savingSection !== null;
        const isEditing = editing.has(s.key) || dirty; // dirty sections stay editable
        const isCollapsed = collapsed.has(s.key) && !dirty; // dirty sections stay open
        return (
          <div
            key={s.key}
            ref={(el) => { sectionRefs.current[s.key] = el; }}
            style={{ paddingBottom: isCollapsed ? 14 : 24, marginBottom: 8, borderBottom: `1px solid ${c.borderColor}`, scrollMarginTop: 12 }}
          >
            <div
              onClick={() => toggleCollapsed(s.key, dirty)}
              role="button"
              aria-expanded={!isCollapsed}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isCollapsed ? 0 : 14, cursor: dirty ? "default" : "pointer", userSelect: "none" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "var(--section-heading)" }}>
                <ChevronDown
                  style={{
                    width: 16,
                    height: 16,
                    color: c.textMuted,
                    transform: isCollapsed ? "rotate(-90deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
                <Icon style={{ width: 17, height: 17, color: c.textMuted }} />
                {s.label}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {!canEdit && <span style={{ fontSize: 10, color: c.textMuted, border: `1px solid ${c.borderColor}`, borderRadius: 6, padding: "2px 7px" }}>View only</span>}
                {canEdit && !isCollapsed && (
                  <button
                    type="button"
                    data-testid={`button-edit-${s.key}`}
                    title={isEditing ? "Done editing" : `Edit ${s.label}`}
                    aria-label={isEditing ? "Done editing" : `Edit ${s.label}`}
                    onClick={(e) => {
                      e.stopPropagation(); // don't toggle collapse
                      if (isEditing) {
                        if (!dirty) setEditingFor(s.key, false); // dirty sections exit via Save/Discard
                      } else {
                        setEditingFor(s.key, true);
                      }
                    }}
                    style={{
                      background: isEditing ? "var(--accent-primary)" : "none",
                      border: `1px solid ${isEditing ? "var(--accent-primary)" : c.borderColor}`,
                      borderRadius: 7, padding: 5, cursor: "pointer", display: "flex", alignItems: "center",
                    }}
                  >
                    <Pencil style={{ width: 12, height: 12, color: isEditing ? "#fff" : c.textMuted }} />
                  </button>
                )}
                <StatusChip section={s} />
              </span>
            </div>

            {!isCollapsed && (
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
                    {isEditing ? (
                      <FieldLabel label={f.ratingRelevant ? `${f.label} · rating` : f.label} required={f.required}>
                        {fieldInput(s.key, f, inputsDisabled)}
                      </FieldLabel>
                    ) : (
                      // Static snapshot — plain label/value text, no input chrome,
                      // until the pencil unlocks the section for editing.
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "2px 0 6px" }}>
                        <span style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, color: c.textMuted }}>
                          {f.label}
                          {f.required && <span style={{ color: "var(--accent-primary)", marginLeft: 3 }}>*</span>}
                        </span>
                        <span style={{ fontSize: 14, lineHeight: 1.45, color: f.value == null || f.value === "" ? c.textMuted : c.textPrimary, fontWeight: 500, overflowWrap: "anywhere" }}>
                          {displayValue(f)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </FieldGrid>
            )}

            {!isCollapsed && dirty && canEdit && (
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
        );
      })}
    </div>
  );
}
