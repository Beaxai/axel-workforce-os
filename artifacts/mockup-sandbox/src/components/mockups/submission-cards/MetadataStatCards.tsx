import { useState } from "react";
import {
  Building2, MapPin, Users, Factory, History, ShieldCheck,
  ChevronDown, Pencil, Check,
} from "lucide-react";
import { SECTIONS, T, type Section } from "./_shared/data";

const ICONS: Record<string, any> = { Building2, MapPin, Users, Factory, History, ShieldCheck };

/**
 * Variant A — "Metadata Stat Cards".
 * Each section is a collapsible card styled exactly like the indication
 * screen's metadata cards: pink 3px left border, 44px icon chip on soft
 * accent, uppercase micro-label, big bold headline value. Collapsed cards
 * read as pure stat cards; expanding reveals the full fact grid.
 */
export function MetadataStatCards() {
  const [open, setOpen] = useState<Set<string>>(new Set(["business"]));
  const toggle = (k: string) =>
    setOpen((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Completeness />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 880, margin: "0 auto" }}>
        {SECTIONS.map((s) => (
          <Card key={s.key} s={s} open={open.has(s.key)} onToggle={() => toggle(s.key)} />
        ))}
      </div>
    </div>
  );
}

function Completeness() {
  return (
    <div style={{ maxWidth: 880, margin: "0 auto 18px", padding: "18px 22px", borderRadius: 14, background: T.panel, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.accent}` }}>
      <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Submission Completeness</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: T.text, lineHeight: 1 }}>5 / 6</span>
        <span style={{ fontSize: 13, color: T.muted }}>sections complete — upload loss runs to submit for proposal</span>
      </div>
      <div style={{ height: 5, borderRadius: 9999, background: "rgba(255,255,255,0.08)", marginTop: 12 }}>
        <div style={{ width: "83%", height: "100%", borderRadius: 9999, background: T.accent }} />
      </div>
    </div>
  );
}

function Card({ s, open, onToggle }: { s: Section; open: boolean; onToggle: () => void }) {
  const Icon = ICONS[s.icon];
  const headline = s.fields.find((f) => f.required)?.value ?? s.fields[0].value;
  return (
    <div style={{ borderRadius: 14, background: T.panel, border: `1px solid ${T.border}`, borderLeft: `3px solid ${s.status === "partial" ? T.amber : T.accent}`, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", cursor: "pointer", userSelect: "none" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon style={{ width: 22, height: 22, color: T.accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headline}</div>
        </div>
        <StatusChip s={s} />
        <button onClick={(e) => e.stopPropagation()} title="Edit section" style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: 7, cursor: "pointer", display: "flex" }}>
          <Pencil style={{ width: 13, height: 13, color: T.muted }} />
        </button>
        <ChevronDown style={{ width: 17, height: 17, color: T.muted, transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.15s", flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{ padding: "4px 20px 20px 80px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 24px" }}>
          {s.fields.map((f) => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                {f.label}{f.required && <span style={{ color: T.accent }}> *</span>}{f.rating && <span style={{ color: T.muted }}> · rating</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: f.value === "—" ? T.muted : T.textSecondary, lineHeight: 1.4 }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusChip({ s }: { s: Section }) {
  const complete = s.status === "complete";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 6, border: `1px solid ${complete ? "rgba(34,197,94,0.4)" : "rgba(255,181,71,0.4)"}`, color: complete ? T.green : T.amber, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
      {complete ? <Check style={{ width: 12, height: 12 }} /> : null}
      {complete ? "Complete" : `${s.missing} missing`}
    </span>
  );
}
