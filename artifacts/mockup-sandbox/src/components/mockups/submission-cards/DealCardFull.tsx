import { useState } from "react";
import {
  Building2, MapPin, Users, Factory, History, ShieldCheck,
  ChevronDown, Pencil, X,
  FileText, BarChart2, ClipboardList, Settings, CheckSquare, BookOpen, Star,
  Banknote, Gauge, AlignLeft,
} from "lucide-react";
import { SECTIONS, T, type Section } from "./_shared/data";

const ICONS: Record<string, any> = { Building2, MapPin, Users, Factory, History, ShieldCheck };

/* ─── Glass tokens ───────────────────────────────────────────────────── */
const glass = {
  surface: {
    backgroundColor: "rgb(255 255 255 / 0.05)",
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
    border: "1px solid rgb(255 255 255 / 0.10)",
  },
  field: {
    backgroundColor: "rgb(255 255 255 / 0.09)",
    border: "1px solid rgb(255 255 255 / 0.16)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    borderRadius: 8,
    padding: "10px 14px",
  },
};

const ACCENT = "#E91E8C";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED = "rgba(255,255,255,0.48)";
const BG = "#060608";
const HEADER_BG = "#0b0b0f";

const NAV_TABS = [
  { key: "overview",        label: "Overview",       Icon: AlignLeft    },
  { key: "submission",      label: "Submission",     Icon: ClipboardList },
  { key: "subjectivities",  label: "Subjectivities", Icon: CheckSquare  },
  { key: "documents",       label: "Documents",      Icon: FileText     },
  { key: "quote",           label: "Quote",          Icon: BarChart2    },
  { key: "policy",          label: "Policy",         Icon: BookOpen     },
  { key: "tasks",           label: "Tasks",          Icon: Settings     },
];

/**
 * Full deal card shell with the glass accordion in the Submission tab.
 * Sized to fill the iframe so the user sees it in context.
 */
export function DealCardFull() {
  const [activeTab, setActiveTab] = useState("submission");
  const [accordionOpen, setAccordionOpen] = useState<string | null>("business");

  return (
    /* Overlay background — same gradient mesh so glass has depth */
    <div style={{
      width: "100%", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: [
        "radial-gradient(ellipse 65% 50% at 15% 20%, rgba(233,30,140,0.18) 0%, transparent 70%)",
        "radial-gradient(ellipse 50% 45% at 85% 80%, rgba(80,10,180,0.16) 0%, transparent 65%)",
        "radial-gradient(ellipse 40% 35% at 55% 45%, rgba(0,120,220,0.08) 0%, transparent 60%)",
        "#03030a",
      ].join(", "),
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Dialog container */}
      <div style={{
        width: "100%", maxWidth: "min(94vw, 1380px)",
        height: "96vh", maxHeight: 920,
        display: "flex", flexDirection: "column",
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        overflow: "hidden",
        color: "#fff",
      }}>

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <DealHeader />

        {/* ── BODY: left nav + content ──────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Left nav */}
          <nav style={{
            width: 132, flexShrink: 0,
            borderRight: `1px solid ${BORDER}`,
            padding: "10px 0",
            overflowY: "auto",
          }}>
            {NAV_TABS.map(({ key, label, Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: 9, padding: "8px 14px",
                    background: active ? "rgba(233,30,140,0.15)" : "transparent",
                    borderLeft: `2px solid ${active ? ACCENT : "transparent"}`,
                    border: "none", cursor: "pointer",
                    color: active ? "#fff" : MUTED,
                    fontSize: 12,
                    transition: "background 120ms ease, color 120ms ease",
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: active ? ACCENT : MUTED, flexShrink: 0 }} />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Main content */}
          <main style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {activeTab === "submission" ? (
              <GlassAccordion open={accordionOpen} setOpen={setAccordionOpen} />
            ) : (
              <div style={{ color: MUTED, fontSize: 13, paddingTop: 40, textAlign: "center" }}>
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tab content
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Deal Header
────────────────────────────────────────────────────────────────────── */
function DealHeader() {
  return (
    <div style={{
      minHeight: 200,
      background: HEADER_BG,
      borderBottom: `1px solid ${BORDER}`,
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "16px 18px 14px",
    }}>
      {/* Faint map-like gradient backdrop */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: [
          "radial-gradient(ellipse 80% 60% at 60% 110%, rgba(233,30,140,0.08) 0%, transparent 70%)",
          "radial-gradient(ellipse 60% 80% at 85% 50%, rgba(80,10,180,0.06) 0%, transparent 65%)",
        ].join(", "),
      }} />

      {/* Top row: identity + close */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Star style={{ width: 18, height: 18, color: ACCENT }} />
            <span style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Hans and Franz Cannabis</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <Badge label="Workers' Comp" />
            <Badge label="PEO" />
            <Badge label="Effective Sep 1, 2026" accent />
          </div>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex" }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Bottom row: KPIs + phase tracker */}
      <div style={{ position: "relative" }}>
        {/* Phase tracker dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
          {["New Lead","Contacted","Indication","Proposal","Bind","Bound"].map((phase, i) => {
            const active = i === 2; // Indication
            const done = i < 2;
            return (
              <div key={phase} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: done || active ? 8 : 6, height: done || active ? 8 : 6,
                  borderRadius: "50%",
                  background: done ? ACCENT : active ? ACCENT : "rgba(255,255,255,0.15)",
                  boxShadow: active ? `0 0 8px ${ACCENT}88` : "none",
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 10, color: active ? "#fff" : done ? MUTED : "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>
                  {phase}
                </span>
                {i < 5 && <div style={{ width: 18, height: 1, background: "rgba(255,255,255,0.12)" }} />}
              </div>
            );
          })}
        </div>

        {/* KPI cluster */}
        <div style={{ display: "flex", gap: "clamp(12px,2.4vw,26px)", flexWrap: "nowrap" }}>
          {[
            { label: "Locations",      value: "4",      Icon: MapPin,    color: ACCENT },
            { label: "Employees",      value: "80",     Icon: Users,     color: ACCENT },
            { label: "Annual Payroll", value: "$4.83M", Icon: Banknote,  color: ACCENT },
            { label: "Exp. Mod",       value: "0.92",   Icon: Gauge,     color: "#fff" },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon style={{ width: 11, height: 11, color: "rgba(255,255,255,0.45)" }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
                  {label}
                </span>
              </div>
              <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.15, marginTop: 3, color, fontVariantNumeric: "tabular-nums" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Badge({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: accent ? 600 : 400,
      padding: "2px 8px", borderRadius: 9999,
      background: accent ? "rgba(233,30,140,0.12)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${accent ? "rgba(233,30,140,0.35)" : "rgba(255,255,255,0.07)"}`,
      color: accent ? ACCENT : MUTED,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Glass Accordion (Submission tab content)
────────────────────────────────────────────────────────────────────── */
function GlassAccordion({ open, setOpen }: { open: string | null; setOpen: (k: string | null) => void }) {
  return (
    <div>
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED }}>
          Submission · 5 / 6 complete
        </span>
        <button style={{
          fontSize: 12, fontWeight: 600, padding: "7px 16px",
          borderRadius: 8, border: "none", cursor: "pointer",
          background: "linear-gradient(90deg, #E91E8C, #9b16d8)",
          color: "#fff", opacity: 0.55,
        }}>Submit for Proposal</button>
      </div>

      <div style={{
        borderRadius: 14, overflow: "hidden",
        ...glass.surface,
      }}>
        {SECTIONS.map((s, i) => (
          <AccordionRow
            key={s.key} s={s} first={i === 0}
            open={open === s.key}
            onToggle={() => setOpen(open === s.key ? null : s.key)}
          />
        ))}
      </div>
    </div>
  );
}

function AccordionRow({ s, first, open, onToggle }: {
  s: Section; first: boolean; open: boolean; onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[s.icon];
  const dot = s.status === "complete" ? T.green : T.amber;

  return (
    <div style={{ borderTop: first ? "none" : "1px solid rgb(255 255 255 / 0.08)" }}>
      <div
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
          cursor: "pointer", userSelect: "none",
          backgroundColor: open
            ? "rgb(255 255 255 / 0.04)"
            : hovered ? "rgb(255 255 255 / 0.025)" : "transparent",
          backdropFilter: open ? "blur(20px) saturate(140%)" : "none",
          WebkitBackdropFilter: open ? "blur(20px) saturate(140%)" : "none",
          transition: "background-color 120ms ease",
        }}
      >
        <Icon style={{
          width: 15, height: 15, flexShrink: 0,
          color: open ? ACCENT : MUTED,
          filter: open ? `drop-shadow(0 0 5px ${ACCENT}77)` : "none",
          transition: "color 0.15s ease",
        }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", flex: 1 }}>{s.label}</span>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, boxShadow: `0 0 7px ${dot}88`, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: MUTED, width: 72 }}>
          {s.status === "complete" ? "Complete" : `${s.missing} missing`}
        </span>
        <button
          onClick={(e) => e.stopPropagation()}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: 5, cursor: "pointer", display: "flex" }}
        >
          <Pencil style={{ width: 11, height: 11, color: MUTED }} />
        </button>
        <ChevronDown style={{
          width: 15, height: 15, color: MUTED, flexShrink: 0,
          transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.15s",
        }} />
      </div>

      {open && (
        <div style={{
          padding: "4px 18px 18px 45px",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 14px",
          borderTop: "1px solid rgb(255 255 255 / 0.06)",
          background: "rgb(0 0 0 / 0.06)",
        }}>
          {s.fields.map((f) => (
            <div key={f.label} style={{ ...glass.field, marginTop: 10 }}>
              <div style={{ fontSize: 9.5, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {f.label}{f.required && <span style={{ color: ACCENT }}> *</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: f.value === "—" ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.85)" }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
