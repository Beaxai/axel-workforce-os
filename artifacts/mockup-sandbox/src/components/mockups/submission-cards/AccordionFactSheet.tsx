import { useState } from "react";
import {
  Building2, MapPin, Users, Factory, History, ShieldCheck,
  ChevronDown, Pencil,
} from "lucide-react";
import { SECTIONS, T, type Section } from "./_shared/data";

const ICONS: Record<string, any> = { Building2, MapPin, Users, Factory, History, ShieldCheck };

/* ─── Glass tokens ──────────────────────────────────────────────────── */
const glass = {
  // surface-glass: heavy — container, row headers
  surface: {
    backgroundColor: "rgb(255 255 255 / 0.05)",
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
    border: "1px solid rgb(255 255 255 / 0.10)",
  },
  // field-glass: light — expanded field cells
  field: {
    backgroundColor: "rgb(255 255 255 / 0.09)",
    border: "1px solid rgb(255 255 255 / 0.16)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    borderRadius: 8,
    padding: "10px 14px",
  },
  // row divider in glass context
  rowDivider: "1px solid rgb(255 255 255 / 0.08)",
};

/**
 * Accordion Fact Sheet — glass morphism edition.
 * surface-glass on the container, field-glass on each expanded field cell.
 * Background is a layered radial gradient mesh so backdrop-filter has depth.
 */
export function AccordionFactSheet() {
  const [open, setOpen] = useState<string | null>("business");

  return (
    <div
      style={{
        minHeight: "100vh",
        // Layered gradient mesh so the blur has visible depth behind it
        background: [
          "radial-gradient(ellipse 70% 55% at 18% 20%, rgba(233,30,140,0.22) 0%, transparent 70%)",
          "radial-gradient(ellipse 55% 45% at 82% 75%, rgba(90,20,200,0.20) 0%, transparent 65%)",
          "radial-gradient(ellipse 40% 35% at 55% 45%, rgba(0,160,255,0.10) 0%, transparent 60%)",
          "#060610",
        ].join(", "),
        padding: 28,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          borderRadius: 14,
          overflow: "hidden",
          ...glass.surface,
        }}
      >
        {SECTIONS.map((s, i) => (
          <Row
            key={s.key}
            s={s}
            first={i === 0}
            open={open === s.key}
            onToggle={() => setOpen(open === s.key ? null : s.key)}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  s, first, open, onToggle,
}: {
  s: Section; first: boolean; open: boolean; onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[s.icon];
  const dot = s.status === "complete" ? T.green : T.amber;

  return (
    <div style={{ borderTop: first ? "none" : glass.rowDivider }}>
      {/* Row header */}
      <div
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "15px 20px",
          cursor: "pointer",
          userSelect: "none",
          backgroundColor: open
            ? "rgb(255 255 255 / 0.04)"
            : hovered
              ? "rgb(255 255 255 / 0.03)"
              : "transparent",
          backdropFilter: open ? "blur(20px) saturate(140%)" : "none",
          WebkitBackdropFilter: open ? "blur(20px) saturate(140%)" : "none",
          transition: "background-color 120ms ease",
        }}
      >
        <Icon
          style={{
            width: 16, height: 16, flexShrink: 0,
            color: open ? T.accent : "rgb(255 255 255 / 0.45)",
            filter: open ? `drop-shadow(0 0 6px ${T.accent}88)` : "none",
            transition: "color 0.15s ease, filter 0.15s ease",
          }}
        />

        <span style={{ fontSize: 14.5, fontWeight: 700, color: T.text, flex: 1 }}>
          {s.label}
        </span>

        <span style={{
          width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
          background: dot, boxShadow: `0 0 8px ${dot}88`,
        }} />

        <span style={{ fontSize: 11, color: "rgb(255 255 255 / 0.45)", width: 78 }}>
          {s.status === "complete" ? "Complete" : `${s.missing} missing`}
        </span>

        <button
          onClick={(e) => e.stopPropagation()}
          title="Edit section"
          style={{
            background: "none",
            border: "1px solid rgb(255 255 255 / 0.14)",
            borderRadius: 7,
            padding: 6,
            cursor: "pointer",
            display: "flex",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <Pencil style={{ width: 12, height: 12, color: "rgb(255 255 255 / 0.45)" }} />
        </button>

        <ChevronDown style={{
          width: 16, height: 16,
          color: "rgb(255 255 255 / 0.35)",
          transform: open ? "none" : "rotate(-90deg)",
          transition: "transform 0.15s",
          flexShrink: 0,
        }} />
      </div>

      {/* Expanded field grid */}
      {open && (
        <div style={{
          padding: "4px 20px 20px 48px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px 16px",
          borderTop: "1px solid rgb(255 255 255 / 0.06)",
          background: "rgb(0 0 0 / 0.08)",
        }}>
          {s.fields.map((f) => (
            <div key={f.label} style={{ ...glass.field, marginTop: 10 }}>
              <div style={{
                fontSize: 10,
                color: "rgb(255 255 255 / 0.45)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 5,
              }}>
                {f.label}
                {f.required && <span style={{ color: T.accent }}> *</span>}
              </div>
              <div style={{
                fontSize: 13.5,
                fontWeight: 500,
                lineHeight: 1.4,
                color: f.value === "—" ? "rgb(255 255 255 / 0.30)" : T.textSecondary,
              }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
