/**
 * Full UI flow diagram for Axel Workforce OS.
 * Node-and-edge SVG chart; no external libraries.
 */
import { useEffect, useRef, useState } from "react";

const PINK = "#E91E8C";
const PURPLE = "#7c3aed";
const BLUE = "#2563eb";
const GREEN = "#059669";
const AMBER = "#d97706";
const TEAL = "#0891b2";
const SLATE = "#475569";
const DARK_BG = "#09090c";
const CARD = "#14141a";
const BORDER = "#28283a";

type FlowNode = {
  id: string;
  label: string;
  sub?: string;
  x: number; y: number; w: number; h: number;
  color?: string;
  bold?: boolean;
};

type FlowEdge = {
  from: string;
  to: string;
  label?: string;
  color?: string;
  dashed?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// NODE DEFINITIONS  (x,y = top-left)
// Layout: columns by depth, rows by feature area
// ─────────────────────────────────────────────────────────────────────────────
const COL0 = 40;   // Auth / entry
const COL1 = 260;  // AppShell / redirect
const COL2 = 480;  // Role dashboards
const COL3 = 700;  // Core pages
const COL4 = 940;  // Sub-pages / modals
const COL5 = 1190; // Deep sub-flows (tabs, wizard steps)
const COL6 = 1470; // Wizard phase details

const NW = 180, NH = 48;   // standard node
const TW = 140, TH = 38;   // tab node
const DW = 250, DH = 58;   // detail node

const NODES: FlowNode[] = [
  // ── Col 0: Auth ────────────────────────────────────────────
  { id:"login",        label:"/login",              sub:"LoginPage",         x:COL0,  y:60,   w:NW,  h:NH,   color:BLUE  },
  { id:"register",     label:"/register/agent",     sub:"AgentRegister",     x:COL0,  y:130,  w:NW,  h:NH,   color:BLUE  },
  { id:"agreement",    label:"…/agreement/:id",     sub:"AgentAgreement",    x:COL0,  y:200,  w:NW,  h:NH,   color:BLUE  },
  { id:"onboarding-r", label:"…/onboarding/:id",   sub:"AgentOnboarding",   x:COL0,  y:270,  w:NW,  h:NH,   color:BLUE  },
  { id:"unauthorized", label:"/unauthorized",        sub:"UnauthorizedPage",  x:COL0,  y:340,  w:NW,  h:NH,   color:SLATE },
  { id:"notfound",     label:"*",                   sub:"404 NotFound",       x:COL0,  y:410,  w:NW,  h:NH,   color:SLATE },

  // ── Col 1: AppShell root ────────────────────────────────────
  { id:"root",         label:"/",                   sub:"RootRedirect",      x:COL1,  y:60,   w:NW,  h:NH },

  // ── Col 2: Role Dashboards ──────────────────────────────────
  { id:"d-admin",      label:"/dashboard/admin",    x:COL2,  y:60,   w:NW, h:NH, color:AMBER  },
  { id:"d-agent",      label:"/dashboard/agent",    x:COL2,  y:118,  w:NW, h:NH, color:GREEN  },
  { id:"d-uw",         label:"/dashboard/underwriter",x:COL2,y:176,  w:NW, h:NH, color:TEAL   },
  { id:"d-csa",        label:"/dashboard/csa",      x:COL2,  y:234,  w:NW, h:NH, color:TEAL   },
  { id:"d-employer",   label:"/dashboard/employer", x:COL2,  y:292,  w:NW, h:NH, color:GREEN  },
  { id:"d-carrier",    label:"/dashboard/carrier",  x:COL2,  y:350,  w:NW, h:NH, color:SLATE  },
  { id:"d-peo",        label:"/dashboard/peo",      x:COL2,  y:408,  w:NW, h:NH, color:SLATE  },
  { id:"d-vendor",     label:"/dashboard/vendor",   x:COL2,  y:466,  w:NW, h:NH, color:SLATE  },

  // ── Col 3: Core pages (AppShell sidebar) ────────────────────
  { id:"pipeline",        label:"/pipeline",            sub:"Pipeline",           x:COL3, y:60,   w:NW, h:NH, color:PINK   },
  { id:"marketplace",     label:"/marketplace",         sub:"Marketplace",        x:COL3, y:118,  w:NW, h:NH, color:PURPLE },
  { id:"accounts",        label:"/accounts",            sub:"Accounts",           x:COL3, y:176,  w:NW, h:NH, color:GREEN  },
  { id:"network",         label:"/network",             sub:"Network",            x:COL3, y:234,  w:NW, h:NH, color:TEAL   },
  { id:"resources",       label:"/resources",           sub:"Resources",          x:COL3, y:292,  w:NW, h:NH },
  { id:"implementations", label:"/implementations",     sub:"Implementations",    x:COL3, y:350,  w:NW, h:NH },
  { id:"billing",         label:"/billing",             sub:"Billing",            x:COL3, y:408,  w:NW, h:NH },
  { id:"profile",         label:"/profile  /users/:id", sub:"UserProfile",        x:COL3, y:466,  w:NW, h:NH },
  { id:"submission",      label:"/submission",          sub:"SubmissionPage",     x:COL3, y:524,  w:NW, h:NH },
  { id:"proposal",        label:"/proposal",            sub:"ProposalScreen",     x:COL3, y:582,  w:NW, h:NH },
  { id:"welcome",         label:"/welcome",             sub:"Welcome",            x:COL3, y:640,  w:NW, h:NH, color:SLATE },
  // Admin tools
  { id:"admin-rates",     label:"/admin/rates",         sub:"RateLookup",         x:COL3, y:720,  w:NW, h:NH, color:AMBER },
  { id:"admin-users",     label:"/admin/users",         sub:"AdminUsers",         x:COL3, y:778,  w:NW, h:NH, color:AMBER },
  { id:"admin-journeys",  label:"/admin/journeys",      sub:"JourneyTemplates",   x:COL3, y:836,  w:NW, h:NH, color:AMBER },
  // Employer sub
  { id:"my-program",      label:"/my-program",          sub:"MyProgram",          x:COL3, y:894,  w:NW, h:NH, color:GREEN },
  { id:"client-onboarding",label:"/my-program/onboarding",sub:"ClientOnboarding",x:COL3, y:952,  w:NW, h:NH, color:GREEN },

  // ── Col 4: Sub-pages / overlays ─────────────────────────────
  // Pipeline → DealCard (modal)
  { id:"dealcard",       label:"DealCardShell",        sub:"modal overlay (event / ?deal=)", x:COL4, y:60,  w:DW, h:NH+10, color:PINK, bold:true },
  // Marketplace funnel
  { id:"vert-detail",    label:"/marketplace/:slug",   sub:"VerticalDetail",     x:COL4, y:150,  w:DW, h:NH },
  { id:"svc-type",       label:"…/quote/service-type", sub:"ServiceTypeSelect",  x:COL4, y:210,  w:DW, h:NH },
  { id:"qw",             label:"…/quote/wizard",       sub:"QuoteWizard",        x:COL4, y:270,  w:DW, h:NH+10, color:PURPLE, bold:true },
  // Accounts
  { id:"account-detail", label:"/accounts/:id",        sub:"AccountDetail",      x:COL4, y:370,  w:DW, h:NH },
  // Network details
  { id:"agent-detail",   label:"/network/agents/:id",  sub:"AgentDetail",        x:COL4, y:430,  w:DW, h:NH },
  { id:"carrier-detail", label:"/network/carriers/:id",sub:"CarrierDetail",      x:COL4, y:480,  w:DW, h:NH },
  { id:"peo-detail",     label:"/network/peo/:id",     sub:"PEODetail",          x:COL4, y:530,  w:DW, h:NH },
  // Resources
  { id:"appetite",       label:"/resources/appetite",  sub:"AppetiteGuide",      x:COL4, y:600,  w:DW, h:NH },
  // Admin sub
  { id:"journey-detail", label:"/admin/journeys/:id",  sub:"JourneyTemplateDetail",x:COL4,y:660, w:DW, h:NH, color:AMBER },
  { id:"user-detail",    label:"/users/:id",            sub:"UserProfile",        x:COL4, y:720,  w:DW, h:NH },

  // ── Col 5: DealCard tabs ──────────────────────────────────────
  { id:"dc-overview",    label:"Overview tab",          x:COL5, y:30,   w:TW+10, h:TH, color:PINK },
  { id:"dc-submission",  label:"Submission tab",        x:COL5, y:76,   w:TW+10, h:TH, color:PINK },
  { id:"dc-subs",        label:"Subjectivities tab",    x:COL5, y:122,  w:TW+10, h:TH, color:PINK },
  { id:"dc-docs",        label:"Documents tab",         x:COL5, y:168,  w:TW+10, h:TH, color:PINK },
  { id:"dc-quote",       label:"Quote tab",             x:COL5, y:214,  w:TW+10, h:TH, color:PINK },
  { id:"dc-policy",      label:"Policy tab",            x:COL5, y:260,  w:TW+10, h:TH, color:PINK },
  // DealCard overlays
  { id:"dc-section-ed",  label:"Section Editor overlay",x:COL5, y:318,  w:TW+50, h:TH, color:PINK },
  { id:"dc-pdf",         label:"PDF Preview modal",     x:COL5, y:364,  w:TW+50, h:TH, color:PINK },
  { id:"dc-location",    label:"Location Popup",        x:COL5, y:410,  w:TW+50, h:TH, color:PINK },
  { id:"dc-pricing",     label:"Pricing Rail",          x:COL5, y:456,  w:TW+50, h:TH, color:PINK },
  { id:"dc-task",        label:"Task Drawer",           x:COL5, y:502,  w:TW+50, h:TH, color:PINK },

  // ── Col 5: QuoteWizard phases ─────────────────────────────────
  { id:"qw-p1",          label:"Phase 1",               sub:"Business → Workforce → ExMod → GenInfo → Indication", x:COL5, y:580, w:DW, h:NH+10, color:PURPLE },
  { id:"qw-p2",          label:"Phase 2",               sub:"Transition → Ops → Safety → Loss → Submit → Confirm",  x:COL5, y:660, w:DW, h:NH+10, color:"#5b21b6" },

  // ── Col 6: Phase 1 steps ──────────────────────────────────────
  { id:"p1s1", label:"1 Business Details",    x:COL6, y:540, w:TW+40, h:TH, color:PURPLE },
  { id:"p1s2", label:"2 Workforce Profile",   x:COL6, y:584, w:TW+40, h:TH, color:PURPLE },
  { id:"p1s3", label:"3 Experience Rating",   x:COL6, y:628, w:TW+40, h:TH, color:PURPLE },
  { id:"p1s4", label:"4 General Information", x:COL6, y:672, w:TW+40, h:TH, color:PURPLE },
  { id:"p1s5", label:"5 Indication",          x:COL6, y:716, w:TW+40, h:TH, color:PURPLE },
  // Phase 2 steps
  { id:"p2s1", label:"Transition screen",     x:COL6, y:784, w:TW+40, h:TH, color:"#5b21b6" },
  { id:"p2s2", label:"Cannabis Operations",   x:COL6, y:828, w:TW+40, h:TH, color:"#5b21b6" },
  { id:"p2s3", label:"Safety & Premises",     x:COL6, y:872, w:TW+40, h:TH, color:"#5b21b6" },
  { id:"p2s4", label:"Extraction (cond.)",    x:COL6, y:916, w:TW+40, h:TH, color:"#5b21b6" },
  { id:"p2s5", label:"Auto Exposure (cond.)", x:COL6, y:960, w:TW+40, h:TH, color:"#5b21b6" },
  { id:"p2s6", label:"Loss History",          x:COL6, y:1004,w:TW+40, h:TH, color:"#5b21b6" },
  { id:"p2s7", label:"Final Submission",      x:COL6, y:1048,w:TW+40, h:TH, color:"#5b21b6" },
  { id:"p2s8", label:"Confirmation",          x:COL6, y:1092,w:TW+40, h:TH, color:"#5b21b6" },
];

// ─────────────────────────────────────────────────────────────────────────────
// EDGE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const EDGES: FlowEdge[] = [
  // Auth flow
  { from:"login",        to:"root",           label:"success",       color:BLUE  },
  { from:"login",        to:"unauthorized",   label:"wrong role",    color:SLATE, dashed:true },
  { from:"register",     to:"agreement",      label:"→" },
  { from:"agreement",    to:"onboarding-r",   label:"→" },

  // Root → dashboards
  { from:"root", to:"d-admin",    color:AMBER },
  { from:"root", to:"d-agent",    color:GREEN },
  { from:"root", to:"d-uw",       color:TEAL  },
  { from:"root", to:"d-csa",      color:TEAL  },
  { from:"root", to:"d-employer", color:GREEN },
  { from:"root", to:"d-carrier",  color:SLATE },
  { from:"root", to:"d-peo",      color:SLATE },
  { from:"root", to:"d-vendor",   color:SLATE },

  // Dashboards → core pages (sidebar nav; representative edges from admin)
  { from:"d-admin",    to:"pipeline",        color:AMBER },
  { from:"d-admin",    to:"marketplace",     color:AMBER },
  { from:"d-admin",    to:"accounts",        color:AMBER },
  { from:"d-admin",    to:"network",         color:AMBER },
  { from:"d-admin",    to:"implementations", color:AMBER },
  { from:"d-admin",    to:"billing",         color:AMBER },
  { from:"d-admin",    to:"resources",       color:AMBER },
  { from:"d-admin",    to:"admin-rates",     color:AMBER },
  { from:"d-admin",    to:"admin-users",     color:AMBER },
  { from:"d-admin",    to:"admin-journeys",  color:AMBER },
  { from:"d-agent",    to:"pipeline",        color:GREEN },
  { from:"d-agent",    to:"marketplace",     color:GREEN },
  { from:"d-agent",    to:"accounts",        color:GREEN },
  { from:"d-uw",       to:"pipeline",        color:TEAL  },
  { from:"d-employer", to:"marketplace",     color:GREEN },
  { from:"d-employer", to:"my-program",      color:GREEN },
  { from:"my-program", to:"client-onboarding", label:"onboarding", color:GREEN },

  // Pipeline → DealCard
  { from:"pipeline",  to:"dealcard",     label:"click deal / ?deal=", color:PINK },

  // DealCard → tabs
  { from:"dealcard",  to:"dc-overview",   color:PINK },
  { from:"dealcard",  to:"dc-submission", color:PINK },
  { from:"dealcard",  to:"dc-subs",       color:PINK },
  { from:"dealcard",  to:"dc-docs",       color:PINK },
  { from:"dealcard",  to:"dc-quote",      color:PINK },
  { from:"dealcard",  to:"dc-policy",     color:PINK },
  { from:"dealcard",  to:"dc-section-ed", label:"edit section",  color:PINK, dashed:true },
  { from:"dealcard",  to:"dc-pdf",        label:"view PDF",      color:PINK, dashed:true },
  { from:"dealcard",  to:"dc-location",   label:"location card", color:PINK, dashed:true },
  { from:"dealcard",  to:"dc-pricing",    color:PINK },
  { from:"dealcard",  to:"dc-task",       color:PINK },
  // DealCard → QuoteWizard
  { from:"dealcard", to:"qw", label:"Request Proposal", color:PINK },

  // Marketplace funnel
  { from:"marketplace",  to:"vert-detail",  label:"vertical card" },
  { from:"vert-detail",  to:"svc-type",     label:"Start Quote CTA" },
  { from:"svc-type",     to:"qw",           label:"WC / PEO / ASO" },

  // QuoteWizard → phases
  { from:"qw",   to:"qw-p1", color:PURPLE },
  { from:"qw-p1",to:"qw-p2", label:"phase 2", color:PURPLE },

  // Phase 1 steps
  { from:"qw-p1", to:"p1s1", color:PURPLE },
  { from:"p1s1",  to:"p1s2", color:PURPLE },
  { from:"p1s2",  to:"p1s3", color:PURPLE },
  { from:"p1s3",  to:"p1s4", color:PURPLE },
  { from:"p1s4",  to:"p1s5", color:PURPLE },

  // Phase 2 steps
  { from:"qw-p2", to:"p2s1", color:"#5b21b6" },
  { from:"p2s1",  to:"p2s2", color:"#5b21b6" },
  { from:"p2s2",  to:"p2s3", color:"#5b21b6" },
  { from:"p2s3",  to:"p2s4", label:"if extraction", color:"#5b21b6", dashed:true },
  { from:"p2s3",  to:"p2s5", label:"if driving",    color:"#5b21b6", dashed:true },
  { from:"p2s4",  to:"p2s6", color:"#5b21b6" },
  { from:"p2s5",  to:"p2s6", color:"#5b21b6" },
  { from:"p2s6",  to:"p2s7", color:"#5b21b6" },
  { from:"p2s7",  to:"p2s8", color:"#5b21b6" },

  // Accounts
  { from:"accounts",      to:"account-detail",  label:"row click" },

  // Network
  { from:"network",       to:"agent-detail",    label:"Agents tab" },
  { from:"network",       to:"carrier-detail",  label:"Carriers tab" },
  { from:"network",       to:"peo-detail",      label:"PEO tab" },

  // Resources
  { from:"resources",     to:"appetite",        label:"appetite guide" },

  // Admin sub-pages
  { from:"admin-journeys",to:"journey-detail",  label:"row click", color:AMBER },
  { from:"admin-users",   to:"user-detail",     label:"row click", color:AMBER },
  { from:"profile",       to:"user-detail",     label:"UserMiniProfile" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const nodeMap = new Map(NODES.map(n => [n.id, n]));

function cx(n: FlowNode) { return n.x + n.w / 2; }
function cy(n: FlowNode) { return n.y + n.h / 2; }
function right(n: FlowNode) { return { x: n.x + n.w, y: cy(n) }; }
function left(n: FlowNode) { return { x: n.x, y: cy(n) }; }

function edgePath(e: FlowEdge): string | null {
  const a = nodeMap.get(e.from); const b = nodeMap.get(e.to);
  if (!a || !b) return null;
  const s = right(a); const t = left(b);
  const dx = Math.abs(t.x - s.x) * 0.45;
  return `M${s.x},${s.y} C${s.x + dx},${s.y} ${t.x - dx},${t.y} ${t.x},${t.y}`;
}

const DIAGRAM_W = 1720;
const DIAGRAM_H = 1180;

// ─────────────────────────────────────────────────────────────────────────────
// LEGEND
// ─────────────────────────────────────────────────────────────────────────────
const LEGEND = [
  { color: BLUE,   label: "Auth / Entry" },
  { color: AMBER,  label: "Admin only" },
  { color: GREEN,  label: "Agent / Employer" },
  { color: TEAL,   label: "UW / CSA" },
  { color: PINK,   label: "Deal Card" },
  { color: PURPLE, label: "Marketplace / Quote" },
  { color: SLATE,  label: "Shared / Restricted" },
];

export function UIFlowDiagram() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ background: DARK_BG, minHeight: "100vh", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
          Axel Workforce OS — UI Flow Schema
        </div>
        <div style={{ fontSize: 12, color: "#6b6b80", marginTop: 4 }}>
          Complete route & navigation map · solid lines = direct nav · dashed = conditional overlay
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
              <span style={{ fontSize: 11, color: "#9999aa" }}>{l.label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={24} height={12}><line x1={0} y1={6} x2={24} y2={6} stroke="#555" strokeWidth={1.5} strokeDasharray="3 2" /></svg>
            <span style={{ fontSize: 11, color: "#9999aa" }}>Conditional / overlay</span>
          </div>
        </div>
      </div>

      {/* Diagram */}
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
        <svg width={DIAGRAM_W} height={DIAGRAM_H} style={{ display: "block" }}>
          <defs>
            {["default","pink","purple","blue","green","amber","teal","slate"].map(k => {
              const c = k === "default" ? "#888" : k === "pink" ? PINK : k === "purple" ? PURPLE : k === "blue" ? BLUE : k === "green" ? GREEN : k === "amber" ? AMBER : k === "teal" ? TEAL : SLATE;
              return (
                <marker key={k} id={`arrow-${k}`} markerWidth={8} markerHeight={8} refX={7} refY={3} orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={c} />
                </marker>
              );
            })}
          </defs>

          {/* Column header labels */}
          {[
            [COL0,  "Auth"],
            [COL1,  "Entry"],
            [COL2,  "Dashboards"],
            [COL3,  "Pages"],
            [COL4,  "Sub-pages"],
            [COL5,  "Tabs / Panels"],
            [COL6,  "Wizard Steps"],
          ].map(([x, label]) => (
            <text key={String(label)} x={Number(x) + 4} y={14} fontSize={10} fill="#3a3a50" fontWeight={600} letterSpacing="0.06em" textTransform="uppercase">
              {String(label).toUpperCase()}
            </text>
          ))}

          {/* Edges — render first so nodes sit on top */}
          {EDGES.map((e, i) => {
            const d = edgePath(e);
            if (!d) return null;
            const col = e.color || "#555";
            const key = col === PINK ? "pink" : col === PURPLE ? "purple" : col === BLUE ? "blue" : col === GREEN ? "green" : col === AMBER ? "amber" : col === TEAL ? "teal" : col === SLATE ? "slate" : "default";
            const isHov = hovered === e.from || hovered === e.to;
            return (
              <g key={i} opacity={hovered ? (isHov ? 1 : 0.15) : 0.6}>
                <path
                  d={d}
                  fill="none"
                  stroke={col}
                  strokeWidth={isHov ? 2 : 1.2}
                  strokeDasharray={e.dashed ? "5 3" : undefined}
                  markerEnd={`url(#arrow-${key})`}
                />
                {e.label && (() => {
                  const a = nodeMap.get(e.from)!; const b = nodeMap.get(e.to)!;
                  const mx = (right(a).x + left(b).x) / 2;
                  const my = (right(a).y + left(b).y) / 2 - 6;
                  return (
                    <text x={mx} y={my} fontSize={9} fill={col} textAnchor="middle" fontWeight={500}>
                      {e.label}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map(n => {
            const accent = n.color || "#3a3a50";
            const isHov = hovered === n.id;
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "default" }}
                opacity={hovered && !isHov ? 0.4 : 1}
              >
                {/* Shadow / glow */}
                {isHov && (
                  <rect x={n.x - 2} y={n.y - 2} width={n.w + 4} height={n.h + 4} rx={8} fill={accent} opacity={0.25} />
                )}
                {/* Card background */}
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={6} fill={CARD} stroke={isHov ? accent : BORDER} strokeWidth={isHov ? 1.5 : 1} />
                {/* Accent left bar */}
                <rect x={n.x} y={n.y + 4} width={3} height={n.h - 8} rx={1.5} fill={accent} />
                {/* Label */}
                <text x={n.x + 10} y={n.y + (n.sub ? n.h / 2 - 2 : n.h / 2 + 4)} fontSize={11} fontWeight={n.bold ? 700 : 500} fill="#dde" dominantBaseline="auto">
                  {n.label}
                </text>
                {n.sub && (
                  <text x={n.x + 10} y={n.y + n.h / 2 + 13} fontSize={9} fill="#6b6b80" dominantBaseline="auto">
                    {n.sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
