/**
 * LocationPopup — glassmorphism detail card for a clicked deal-header map marker.
 *
 * Rendered through a portal at document.body with position: fixed so it sits
 * on top of EVERYTHING (deal modal, header bands, milestone tracker) and is
 * never clipped by the header's overflow. Sized generously so it does not
 * scroll unless the employee-type list is genuinely massive.
 *
 * Shows the location (state + ZIP) and total employees up top, then one row
 * per employee type: a muted icon tile, the class code, and the head-count.
 * Hovering a row reveals an edit affordance — clicking it opens inline FT/PT
 * inputs. A + button in the header adds a brand-new employee type.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Plus, Pencil, Check, MapPin,
  Sprout, Store, Truck, FlaskConical, Briefcase, HardHat, Shield,
} from "lucide-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import type { GeoMarker, GeoMarkerClassCode } from "@/lib/geo";

/** Pick a lucide icon that visually represents an employee type (WC class-code
 * description keywords → icon). Falls back to a generic hard-hat worker. */
export function employeeTypeIcon(description?: string): typeof HardHat {
  const d = (description ?? "").toLowerCase();
  if (/cultivat|farm|grow|nursery|agricult|greenhouse/.test(d)) return Sprout;
  if (/dispensar|retail|store|shop|sales/.test(d)) return Store;
  if (/deliver|driver|transport|trucking|courier/.test(d)) return Truck;
  if (/manufactur|extract|process|lab|chemist/.test(d)) return FlaskConical;
  if (/office|clerical|admin|professional/.test(d)) return Briefcase;
  if (/security|guard/.test(d)) return Shield;
  return HardHat;
}

interface Props {
  marker: GeoMarker;
  /** Viewport coordinates of the clicked dot (fixed positioning anchor). */
  anchor: { clientX: number; clientY: number };
  /** Whether count edits / adds can be persisted (quote-backed markers only). */
  editable: boolean;
  onClose: () => void;
  /** Persist the full new class-code list for this location. Throws on failure. */
  onSave: (classCodes: GeoMarkerClassCode[]) => Promise<void>;
}

interface Draft {
  /** Index into classCodes being edited, or -1 for a new row. */
  index: number;
  code: string;
  description: string;
  ft: string;
  pt: string;
}

const W = 340;

export default function LocationPopup({ marker, anchor, editable, onClose, onSave }: Props) {
  const c = useThemeColors();
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const codes = marker.classCodes ?? [];
  const totalEmployees = codes.length > 0 ? codes.reduce((s, cc) => s + cc.ft + cc.pt, 0) : marker.employees;

  // Fixed-position clamping: prefer opening below-right of the dot, flip/clamp
  // to stay fully on screen. No scroll unless the list truly cannot fit.
  const pos = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    let left = anchor.clientX - W / 2;
    left = Math.max(margin, Math.min(left, vw - W - margin));
    const estH = 120 + codes.length * 62; // rough natural height
    const below = anchor.clientY + 18;
    const openBelow = below + Math.min(estH, vh * 0.7) <= vh - margin || anchor.clientY < vh / 2;
    if (openBelow) {
      const top = Math.min(below, vh - margin - 160);
      return { top: Math.max(margin, top), maxH: vh - Math.max(margin, top) - margin };
    }
    const bottom = vh - anchor.clientY + 18;
    return { bottom: Math.min(bottom, vh - margin - 160), maxH: anchor.clientY - 18 - margin };
  }, [anchor, codes.length]);

  useEffect(() => {
    if (draft) firstInputRef.current?.focus();
  }, [draft]);

  // Escape closes (draft first, then popup).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDraft((d) => (d ? null : (onClose(), null)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const startEdit = (i: number) => {
    const cc = codes[i];
    setError(null);
    setDraft({ index: i, code: cc.code, description: cc.description ?? "", ft: String(cc.ft), pt: String(cc.pt) });
  };
  const startAdd = () => {
    setError(null);
    setDraft({ index: -1, code: "", description: "", ft: "", pt: "0" });
  };

  const commit = async () => {
    if (!draft || saving) return;
    const ft = Math.max(0, Math.round(Number(draft.ft) || 0));
    const pt = Math.max(0, Math.round(Number(draft.pt) || 0));
    if (draft.index === -1 && !draft.code.trim() && !draft.description.trim()) {
      setError("Enter a class code or description.");
      return;
    }
    const next: GeoMarkerClassCode[] =
      draft.index === -1
        ? [...codes, { code: draft.code.trim(), description: draft.description.trim() || undefined, ft, pt }]
        : codes.map((cc, i) => (i === draft.index ? { ...cc, ft, pt } : cc));
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      setDraft(null);
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: 56, padding: "4px 6px", borderRadius: 6, fontSize: 12, fontFamily: "inherit",
    background: "var(--input-bg)", color: "var(--input-text)",
    border: "1px solid var(--input-border)", outline: "none",
  };
  const tileStyle: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 9, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: c.cardBg, border: `1px solid ${c.borderColor}`,
  };

  const body = (
    <div
      role="dialog"
      aria-label={`Location detail: ${marker.label ?? "location"}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed", zIndex: 200, width: W,
        ...("top" in pos ? { top: pos.top } : { bottom: pos.bottom }),
        left: Math.max(12, Math.min(anchor.clientX - W / 2, window.innerWidth - W - 12)),
        maxHeight: pos.maxH, overflowY: "auto",
        background: c.isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.94)",
        backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        border: `1px solid ${c.borderColor}`, borderRadius: 14,
        boxShadow: c.isDark
          ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 24px 80px rgba(0,0,0,0.18)",
        padding: "14px 16px",
      }}
    >
      {/* Header: address + total employees, add + close controls */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <div style={{ minWidth: 0, display: "flex", gap: 9 }}>
          <MapPin style={{ width: 16, height: 16, color: c.textMuted, flexShrink: 0, marginTop: 2 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: c.textPrimary, lineHeight: 1.25 }}>{marker.label ?? "Location"}</div>
            <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              {totalEmployees.toLocaleString()} total {totalEmployees === 1 ? "employee" : "employees"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {editable && (
            <button
              onClick={startAdd}
              aria-label="Add employee type"
              title="Add employee type"
              style={{
                width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                background: c.cardBg, border: `1px solid ${c.borderColor}`, color: c.textMuted, cursor: "pointer", padding: 0,
              }}
            >
              <Plus style={{ width: 15, height: 15 }} />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close location detail"
            style={{
              width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none", color: c.textMuted, cursor: "pointer", padding: 0,
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

      {codes.length === 0 && !draft ? (
        <div style={{ fontSize: 12, color: c.textMuted, padding: "6px 0" }}>
          No employee type breakdown available for this location.
          {editable ? " Use + to add one." : ""}
        </div>
      ) : (
        codes.map((cc, i) => {
          const TypeIcon = employeeTypeIcon(cc.description);
          const count = cc.ft + cc.pt;
          const editing = draft?.index === i;
          const hovered = hoverRow === i && editable && !draft;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoverRow(i)}
              onMouseLeave={() => setHoverRow((h) => (h === i ? null : h))}
              onClick={() => { if (editable && !draft) startEdit(i); }}
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 8px",
                margin: "0 -8px", borderRadius: 9,
                borderTop: i > 0 ? `1px solid ${c.borderColor}` : "none",
                background: hovered ? c.cardBg : "transparent",
                cursor: editable && !draft ? "pointer" : "default",
                transition: "background 120ms ease",
              }}
            >
              <div style={tileStyle}>
                <TypeIcon style={{ width: 20, height: 20, color: c.textMuted }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {editing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                    <label style={{ fontSize: 11, color: "var(--label-text)", display: "flex", alignItems: "center", gap: 5 }}>
                      FT
                      <input
                        ref={firstInputRef}
                        type="number" min={0} value={draft.ft}
                        onChange={(e) => setDraft({ ...draft, ft: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") void commit(); }}
                        style={inputStyle}
                        aria-label="Full-time employees"
                      />
                    </label>
                    <label style={{ fontSize: 11, color: "var(--label-text)", display: "flex", alignItems: "center", gap: 5 }}>
                      PT
                      <input
                        type="number" min={0} value={draft.pt}
                        onChange={(e) => setDraft({ ...draft, pt: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") void commit(); }}
                        style={inputStyle}
                        aria-label="Part-time employees"
                      />
                    </label>
                    <button
                      onClick={() => void commit()}
                      disabled={saving}
                      aria-label="Save employee count"
                      style={{
                        width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                        background: c.cardBg, border: `1px solid ${c.borderColor}`, color: c.textPrimary,
                        cursor: saving ? "wait" : "pointer", padding: 0, opacity: saving ? 0.6 : 1,
                      }}
                    >
                      <Check style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      onClick={() => setDraft(null)}
                      disabled={saving}
                      aria-label="Cancel edit"
                      style={{
                        width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "transparent", border: "none", color: c.textMuted, cursor: "pointer", padding: 0,
                      }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: c.textPrimary, lineHeight: 1.25, fontVariantNumeric: "tabular-nums" }}>
                        {count.toLocaleString()} {count === 1 ? "Employee" : "Employees"}
                      </span>
                      {cc.pt > 0 && (
                        <span style={{ fontSize: 11.5, color: c.textMuted, fontWeight: 400 }}>({cc.ft} FT / {cc.pt} PT)</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: c.textMuted, marginTop: 2, lineHeight: 1.35 }}>
                      {cc.code ? `Class ${cc.code}` : ""}
                      {cc.code && cc.description ? " \u00b7 " : ""}
                      {cc.description ?? ""}
                    </div>
                    {cc.payroll ? (
                      <div style={{ fontSize: 11, color: c.textMuted, marginTop: 1 }}>${cc.payroll.toLocaleString()} payroll</div>
                    ) : null}
                  </>
                )}
              </div>
              {!editing && hovered && (
                <Pencil aria-hidden style={{ width: 14, height: 14, color: c.textMuted, flexShrink: 0 }} />
              )}
            </div>
          );
        })
      )}

      {/* Add-new-employee-type draft row */}
      {draft?.index === -1 && (
        <div
          style={{
            display: "flex", alignItems: "flex-start", gap: 11, padding: "10px 8px", margin: "0 -8px",
            borderTop: codes.length > 0 ? `1px solid ${c.borderColor}` : "none", borderRadius: 9,
          }}
        >
          <div style={tileStyle}>
            <Plus style={{ width: 20, height: 20, color: c.textMuted }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", gap: 7 }}>
              <input
                ref={firstInputRef}
                placeholder="Class code"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                style={{ ...inputStyle, width: 84 }}
                aria-label="Class code"
              />
              <input
                placeholder="Description"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                style={{ ...inputStyle, flex: 1, width: "auto" }}
                aria-label="Employee type description"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 11, color: "var(--label-text)", display: "flex", alignItems: "center", gap: 5 }}>
                FT
                <input
                  type="number" min={0} value={draft.ft}
                  onChange={(e) => setDraft({ ...draft, ft: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") void commit(); }}
                  style={inputStyle}
                  aria-label="Full-time employees"
                />
              </label>
              <label style={{ fontSize: 11, color: "var(--label-text)", display: "flex", alignItems: "center", gap: 5 }}>
                PT
                <input
                  type="number" min={0} value={draft.pt}
                  onChange={(e) => setDraft({ ...draft, pt: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") void commit(); }}
                  style={inputStyle}
                  aria-label="Part-time employees"
                />
              </label>
              <button
                onClick={() => void commit()}
                disabled={saving}
                aria-label="Save new employee type"
                style={{
                  width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                  background: c.cardBg, border: `1px solid ${c.borderColor}`, color: c.textPrimary,
                  cursor: saving ? "wait" : "pointer", padding: 0, opacity: saving ? 0.6 : 1,
                }}
              >
                <Check style={{ width: 14, height: 14 }} />
              </button>
              <button
                onClick={() => setDraft(null)}
                disabled={saving}
                aria-label="Cancel new employee type"
                style={{
                  width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "none", color: c.textMuted, cursor: "pointer", padding: 0,
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ fontSize: 11.5, color: "#ef4444", marginTop: 6 }}>{error}</div>}
    </div>
  );

  return createPortal(body, document.body);
}
