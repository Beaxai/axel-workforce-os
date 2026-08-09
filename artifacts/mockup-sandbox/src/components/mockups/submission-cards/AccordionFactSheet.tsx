import { useState } from "react";
import {
  Building2, MapPin, Users, Factory, History, ShieldCheck,
  ChevronDown, Pencil,
} from "lucide-react";
import { SECTIONS, T, type Section } from "./_shared/data";

const ICONS: Record<string, any> = { Building2, MapPin, Users, Factory, History, ShieldCheck };

/**
 * Variant C — "Accordion Fact Sheet".
 * One flat, quiet accordion — closest to a legal/underwriting fact sheet.
 * Cards share the indication metadata palette but drop icon chips for tiny
 * inline icons and a single hairline stack, with a sticky stat strip on top
 * (Locations / Employees / Payroll / EMod) exactly like the indication
 * screen's 4-up stat row.
 */
export function AccordionFactSheet() {
  const [open, setOpen] = useState<string | null>("business");
  const stats = [
    { label: "Locations", value: "4", icon: MapPin },
    { label: "Employees", value: "80", icon: Users },
    { label: "Annual Payroll", value: "$4.83M", icon: Factory },
    { label: "Experience Mod", value: "0.92", icon: ShieldCheck },
  ];
  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
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
      <div style={{ maxWidth: 900, margin: "0 auto", borderRadius: 14, background: T.panel, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        {SECTIONS.map((s, i) => (
          <Row key={s.key} s={s} first={i === 0} open={open === s.key} onToggle={() => setOpen(open === s.key ? null : s.key)} />
        ))}
      </div>
    </div>
  );
}

function Row({ s, first, open, onToggle }: { s: Section; first: boolean; open: boolean; onToggle: () => void }) {
  const Icon = ICONS[s.icon];
  const dot = s.status === "complete" ? T.green : T.amber;
  return (
    <div style={{ borderTop: first ? "none" : `1px solid ${T.border}` }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 20px", cursor: "pointer", userSelect: "none", background: open ? "rgba(255,255,255,0.02)" : "none" }}>
        <Icon style={{ width: 16, height: 16, color: open ? T.accent : T.muted, flexShrink: 0 }} />
        <span style={{ fontSize: 14.5, fontWeight: 700, color: T.text, flex: 1 }}>{s.label}</span>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, boxShadow: `0 0 8px ${dot}66` }} />
        <span style={{ fontSize: 11, color: T.muted, width: 78 }}>{s.status === "complete" ? "Complete" : `${s.missing} missing`}</span>
        <button onClick={(e) => e.stopPropagation()} title="Edit section" style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 7, padding: 6, cursor: "pointer", display: "flex" }}>
          <Pencil style={{ width: 12, height: 12, color: T.muted }} />
        </button>
        <ChevronDown style={{ width: 16, height: 16, color: T.muted, transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }} />
      </div>
      {open && (
        <div style={{ padding: "2px 20px 20px 48px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 24px" }}>
          {s.fields.map((f) => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                {f.label}{f.required && <span style={{ color: T.accent }}> *</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: f.value === "—" ? T.muted : T.textSecondary, lineHeight: 1.4 }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
