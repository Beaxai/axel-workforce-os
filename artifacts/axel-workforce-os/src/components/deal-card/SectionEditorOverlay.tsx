/**
 * Phase 4C — glassmorphism section editor overlay. View → Edit → Save for a
 * single submission section. Editable affordances are gated on server-computed
 * `canEdit` access (spec §8). Read-only / computed fields are shown but never
 * editable. Save sends only changed editable fields to the PATCH endpoint.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { SectionFieldView, SectionView } from "./types";
import { sectionIcon } from "./icons";
import { useThemeColors } from "@/lib/use-theme-colors";

interface SectionEditorOverlayProps {
  section: SectionView | null;
  canEdit: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (fields: Record<string, unknown>) => void;
}

function displayValue(f: SectionFieldView): string {
  if (f.value == null || f.value === "") return "\u2014";
  if (f.type === "boolean") return f.value ? "Yes" : "No";
  if (f.type === "array") return Array.isArray(f.value) ? f.value.join(", ") : String(f.value);
  return String(f.value);
}

function inputValue(f: SectionFieldView): string {
  if (f.value == null) return "";
  if (f.type === "array") return Array.isArray(f.value) ? f.value.join(", ") : String(f.value);
  if (f.type === "boolean") return f.value ? "true" : "false";
  return String(f.value);
}

export default function SectionEditorOverlay({
  section,
  canEdit,
  saving,
  onClose,
  onSave,
}: SectionEditorOverlayProps) {
  const c = useThemeColors();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setEditing(false);
    if (section) {
      const d: Record<string, string> = {};
      section.fields.forEach((f) => (d[f.key] = inputValue(f)));
      setDraft(d);
    }
  }, [section]);

  const Icon = useMemo(() => (section ? sectionIcon(section.icon) : null), [section]);
  if (!section) return null;

  const handleSave = () => {
    const changed: Record<string, unknown> = {};
    for (const f of section.fields) {
      if (f.readOnly) continue;
      const raw = draft[f.key] ?? "";
      const before = inputValue(f);
      if (raw === before) continue;
      if (f.type === "number") changed[f.key] = raw === "" ? null : Number(raw);
      else if (f.type === "boolean") changed[f.key] = raw === "true";
      else if (f.type === "array") changed[f.key] = raw.split(",").map((s) => s.trim()).filter(Boolean);
      else changed[f.key] = raw;
    }
    onSave(changed);
  };

  const fieldInput = (f: SectionFieldView) => {
    const baseStyle: React.CSSProperties = {
      background: c.inputBg,
      border: `1px solid ${c.inputBorder}`,
      borderRadius: 8,
      color: c.inputText,
      fontFamily: "inherit",
      fontSize: 13,
      padding: "8px 10px",
      width: "100%",
      boxSizing: "border-box",
    };
    if (f.readOnly) {
      return <div style={{ fontSize: 13, color: c.textMuted }}>{displayValue(f)}</div>;
    }
    if (f.type === "boolean") {
      return (
        <select
          value={draft[f.key] ?? "false"}
          onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
          style={baseStyle}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    return (
      <input
        type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
        value={draft[f.key] ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
        style={baseStyle}
      />
    );
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay-bg)",
        backdropFilter: "var(--overlay-blur)",
        WebkitBackdropFilter: "var(--overlay-blur)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: c.isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.92)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: `1px solid ${c.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: `1px solid ${c.borderColor}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 500, color: c.textPrimary }}>
            {Icon && <Icon style={{ width: 17, height: 17, color: c.textMuted }} />}
            {section.label}
          </div>
          <X onClick={onClose} style={{ width: 18, height: 18, color: c.textMuted, cursor: "pointer" }} />
        </div>

        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11, maxHeight: "60vh", overflow: "auto" }}>
          {section.fields.map((f) => (
            <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, letterSpacing: "0.04em", color: c.textMuted }}>
                {f.label}
                {f.ratingRelevant ? " \u00b7 rating" : ""}
              </label>
              {editing ? fieldInput(f) : <div style={{ fontSize: 13, color: c.textPrimary }}>{displayValue(f)}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: `1px solid ${c.borderColor}` }}>
          {!editing ? (
            canEdit ? (
              <button
                onClick={() => setEditing(true)}
                style={{ fontFamily: "inherit", fontSize: 12, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: c.textSecondary, background: "none", border: `1px solid ${c.borderColor}` }}
              >
                Edit
              </button>
            ) : (
              <span style={{ fontSize: 11, color: c.textMuted }}>View only</span>
            )
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                style={{ fontFamily: "inherit", fontSize: 12, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: c.textSecondary, background: "none", border: `1px solid ${c.borderColor}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ fontFamily: "inherit", fontSize: 12, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: "#fff", background: "var(--gradient-cta)", fontWeight: 500, border: "none" }}
              >
                {saving ? "Saving\u2026" : "Save changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
