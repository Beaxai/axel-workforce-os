import { useState } from "react";
import {
  Building2, MapPin, Users, Factory, History, ShieldCheck,
  ChevronDown, Pencil, Check,
} from "lucide-react";
import { SECTIONS, T, type Section } from "./_shared/data";

const ICONS: Record<string, any> = { Building2, MapPin, Users, Factory, History, ShieldCheck };

/**
 * Variant B — "Two-Column Card Grid".
 * Sections sit in a dense 2-up dashboard grid of metadata cards (40px icon
 * chip beside the title, indication-style panel background). Collapsed cards
 * show a compact 2-stat teaser row; expanding stretches the card to show all
 * fields in a 2-col grid. Denser overview, less scrolling.
 */
export function TwoColumnCardGrid() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setOpen((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Submission Completeness</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: T.text }}>5 / 6 <span style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>complete</span></div>
        </div>
        <button style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: "linear-gradient(90deg,#E91E8C,#B326E0)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: 0.55 }}>Submit for Proposal</button>
      </div>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
        {SECTIONS.map((s) => (
          <Card key={s.key} s={s} open={open.has(s.key)} onToggle={() => toggle(s.key)} />
        ))}
      </div>
    </div>
  );
}

function Card({ s, open, onToggle }: { s: Section; open: boolean; onToggle: () => void }) {
  const Icon = ICONS[s.icon];
  const teaser = s.fields.filter((f) => f.required).slice(0, 2);
  return (
    <div style={{ borderRadius: 14, background: T.panel, border: `1px solid ${T.border}`, gridColumn: open ? "1 / -1" : "auto" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", cursor: "pointer", userSelect: "none" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon style={{ width: 20, height: 20, color: T.accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{s.label}</div>
          <div style={{ fontSize: 11, color: s.status === "complete" ? T.green : T.amber, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            {s.status === "complete" ? <><Check style={{ width: 11, height: 11 }} />Complete</> : `${s.missing} field missing`}
          </div>
        </div>
        <button onClick={(e) => e.stopPropagation()} title="Edit section" style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}>
          <Pencil style={{ width: 12, height: 12, color: T.muted }} />
        </button>
        <ChevronDown style={{ width: 16, height: 16, color: T.muted, transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }} />
      </div>
      {!open && (
        <div style={{ display: "flex", gap: 26, padding: "0 18px 16px 70px" }}>
          {teaser.map((f) => (
            <div key={f.label} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9.5, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: f.value === "—" ? T.muted : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}
      {open && (
        <div style={{ padding: "0 18px 18px 70px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "13px 22px" }}>
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
