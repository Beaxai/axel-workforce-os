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
import { useState } from "react";
import type { SectionFieldView, SectionView } from "./types";
import { sectionIcon, STATUS_COLORS } from "./icons";
import { useThemeColors } from "@/lib/use-theme-colors";
import {
  FieldGrid,
  FieldLabel,
  TextInput,
  NumberInput,
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
const STATE_SELECT_KEYS = new Set(["state"]);

export default function SubmissionTab({
  sections,
  aggregateComplete,
  total,
  access,
  savingSection,
  onSaveSection,
}: SubmissionTabProps) {
  const c = useThemeColors();
  const pct = total > 0 ? Math.round((aggregateComplete / total) * 100) : 0;

  // Drafts hold ONLY touched fields, keyed "<sectionKey>.<fieldKey>". Values
  // for untouched fields always come from the server payload, so a successful
  // save (which refreshes `sections`) just needs the section's drafts cleared.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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

  const discardSection = (sKey: string) =>
    setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith(`${sKey}.`))));

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
        return (
          <div key={s.key} style={{ paddingBottom: 24, marginBottom: 8, borderBottom: `1px solid ${c.borderColor}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "var(--section-heading)" }}>
                <Icon style={{ width: 17, height: 17, color: c.textMuted }} />
                {s.label}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {!canEdit && <span style={{ fontSize: 10, color: c.textMuted, border: `1px solid ${c.borderColor}`, borderRadius: 6, padding: "2px 7px" }}>View only</span>}
                <StatusChip section={s} />
              </span>
            </div>

            <FieldGrid columns={2}>
              {s.fields.map((f) => (
                <FieldLabel key={f.key} label={f.ratingRelevant ? `${f.label} · rating` : f.label} required={f.required}>
                  {fieldInput(s.key, f, inputsDisabled)}
                </FieldLabel>
              ))}
            </FieldGrid>

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
        );
      })}
    </div>
  );
}
