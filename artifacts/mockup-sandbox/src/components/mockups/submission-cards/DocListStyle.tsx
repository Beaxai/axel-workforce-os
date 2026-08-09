import { useState } from "react";
import {
  Building2, MapPin, Users, Factory, History, ShieldCheck,
  Pencil,
} from "lucide-react";
import { SECTIONS, T, type Section } from "./_shared/data";

const ICONS: Record<string, any> = { Building2, MapPin, Users, Factory, History, ShieldCheck };

/**
 * Variant — "Document List Style".
 *
 * Takes the AccordionFactSheet's KPI strip + section list layout but renders
 * sections as rows in the app's QuietRow document-list pattern:
 *   [icon] Section name · N fields       Status text   [pencil]
 * Click a row to expand an inline field grid (same indentation as doc sub-rows).
 * Dark theme tokens match the app's cardBg / inputBorder palette exactly.
 */
export function DocListStyle() {
  const [open, setOpen] = useState<string | null>("business");
  const [hovered, setHovered] = useState<string | null>(null);

  const stats = [
    { label: "Locations",      value: "4",      icon: MapPin     },
    { label: "Employees",      value: "80",      icon: Users      },
    { label: "Annual Payroll", value: "$4.83M",  icon: Factory    },
    { label: "Experience Mod", value: "0.92",    icon: ShieldCheck },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* KPI strip */}
      <div style={{ maxWidth: 900, margin: "0 auto 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <div key={st.label} style={{ padding: "14px 16px", borderRadius: 12, background: T.panel, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.accent}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: 17, height: 17, color: T.accent }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{st.label}</div>
                <div style={{ fontSize: 21, fontWeight: 700, color: T.text, lineHeight: 1 }}>{st.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section list */}
      <div style={{ maxWidth: 900, margin: "0 auto", borderRadius: 12, background: T.panel, border: `1px solid ${T.border}`, overflow: "hidden" }}>

        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "20px minmax(0, 1fr) 90px 32px",
          gap: 12,
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: `1px solid ${T.border}`,
        }}>
          <span />
          <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Section</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</span>
          <span />
        </div>

        {/* Rows */}
        {SECTIONS.map((s, i) => (
          <SectionRow
            key={s.key}
            s={s}
            last={i === SECTIONS.length - 1}
            open={open === s.key}
            hovered={hovered === s.key}
            onToggle={() => setOpen(open === s.key ? null : s.key)}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
    </div>
  );
}

function SectionRow({
  s, last, open, hovered, onToggle, onMouseEnter, onMouseLeave,
}: {
  s: Section; last: boolean; open: boolean; hovered: boolean;
  onToggle: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const Icon = ICONS[s.icon];
  const complete = s.status === "complete";
  const inputBorder = "rgba(255,255,255,0.12)";
  const hoverBg = "rgba(255,255,255,0.04)";

  return (
    <>
      {/* Main row */}
      <div
        onClick={onToggle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          display: "grid",
          gridTemplateColumns: "20px minmax(0, 1fr) 90px 32px",
          gap: 12,
          alignItems: "center",
          padding: "13px 16px",
          borderBottom: (open || !last) ? `1px solid ${inputBorder}` : "none",
          background: hovered && !open ? hoverBg : open ? "rgba(255,255,255,0.025)" : "transparent",
          transition: "background 120ms ease",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Icon */}
        <Icon style={{ width: 16, height: 16, color: open ? T.accent : T.muted, flexShrink: 0, transition: "color 120ms ease" }} />

        {/* Name + subline */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.label}
          </span>
          <span style={{ fontSize: 11.5, marginTop: 3, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {s.fields.length} field{s.fields.length !== 1 ? "s" : ""}
            {!complete && ` · ${s.missing} missing`}
          </span>
        </div>

        {/* Status */}
        <span style={{ fontSize: 11.5, color: complete ? T.green : T.amber, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: complete ? T.green : T.amber, flexShrink: 0, boxShadow: complete ? `0 0 6px ${T.green}66` : `0 0 6px ${T.amber}66` }} />
          {complete ? "Complete" : "Incomplete"}
        </span>

        {/* Pencil */}
        <button
          onClick={(e) => e.stopPropagation()}
          title="Edit section"
          style={{ background: "none", border: `1px solid ${inputBorder}`, borderRadius: 6, padding: 5, cursor: "pointer", display: "flex", color: T.muted, opacity: hovered ? 1 : 0, transition: "opacity 120ms ease" }}
        >
          <Pencil style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* Expanded field grid */}
      {open && (
        <div style={{
          padding: "12px 16px 16px 48px",
          borderBottom: last ? "none" : `1px solid ${inputBorder}`,
          background: "rgba(255,255,255,0.015)",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 20px" }}>
            {s.fields.map((f) => (
              <div key={f.label}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                  {f.label}
                  {f.required && <span style={{ color: T.accent }}> *</span>}
                  {f.rating && <span style={{ color: "rgba(255,255,255,0.28)", fontWeight: 400 }}> · RTG</span>}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: f.value === "—" ? T.muted : T.textSecondary, lineHeight: 1.4 }}>
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
