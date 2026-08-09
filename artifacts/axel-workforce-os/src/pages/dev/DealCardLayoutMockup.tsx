/**
 * DEV-ONLY mockup — proposed deal-card rearrangement (not wired to data).
 *
 * Proposal under review: move the WC/WFS pricing cards back into the right
 * rail (where the TaskDrawer sits today) and return Tasks to the left sub-nav
 * as a tab. Two variants of the right rail:
 *   ?v=a  Classic cards  — current PricingRail cards stacked in the rail
 *   ?v=b  Premium badge  — approved pink-glow premium card + Modify Pricing
 *
 * Route is registered only when import.meta.env.DEV. Delete after review.
 */
import { useSearchParams } from "react-router-dom";
import {
  X, LayoutDashboard, ClipboardList, Folder, Calculator, Shield, ShieldCheck, CheckSquare, Plus,
} from "lucide-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import PricingRail from "@/components/deal-card/PricingRail";
import wcShieldIcon from "@assets/Shield-Icon_1780952893965.png";

const NAV = [
  { key: "overview", label: "Overview", Icon: LayoutDashboard },
  { key: "submission", label: "Submission", Icon: ClipboardList },
  { key: "subjectivities", label: "Subjectivities", Icon: ShieldCheck },
  { key: "documents", label: "Documents", Icon: Folder },
  { key: "quote", label: "Quote", Icon: Calculator },
  { key: "policy", label: "Policy", Icon: Shield },
  { key: "tasks", label: "Tasks", Icon: CheckSquare }, // ← returned to the nav
];

const MOCK_TASKS = [
  { id: "1", name: "Request Proposal", assignee: "Sarah Mitchell", due: "7/27/2026", done: false, overdue: true },
  { id: "2", name: "Collect currently-valued loss runs", assignee: "Marcus Webb", due: "8/14/2026", done: false, overdue: false },
  { id: "3", name: "Confirm FEIN and legal entity name", assignee: "Sarah Mitchell", due: "8/18/2026", done: false, overdue: false },
  { id: "4", name: "Verify class code 8017 split", assignee: "Dana Ortiz", due: "8/02/2026", done: true, overdue: false },
];

function TasksTabContent() {
  const c = useThemeColors();
  const groupLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: c.textMuted,
  };
  const row = (t: (typeof MOCK_TASKS)[number]) => (
    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, background: c.cardBg, border: `1px solid ${t.overdue ? "rgba(239,68,68,0.45)" : c.borderColor}`, borderRadius: 10, padding: "10px 12px" }}>
      <CheckSquare style={{ width: 16, height: 16, color: t.done ? "#4caf50" : c.textMuted, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: c.textPrimary, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.6 : 1 }}>{t.name}</div>
        <div style={{ fontSize: 11, color: c.textMuted, display: "flex", gap: 4 }}>
          <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>{t.assignee}</span>
          <span>·</span>
          <span style={{ color: t.overdue && !t.done ? "#ef4444" : undefined }}>{t.due}</span>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>Tasks</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: c.textSecondary, background: c.hoverBg, border: `1px solid ${c.borderColor}`, borderRadius: 9, padding: "1px 6px" }}>3</span>
        <button style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${c.borderColor}`, borderRadius: 8, color: c.textSecondary, fontSize: 12, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit" }}>
          <Plus style={{ width: 13, height: 13 }} /> Add task
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ ...groupLabel, color: "#ef4444" }}>Overdue</span>
        {MOCK_TASKS.filter((t) => t.overdue && !t.done).map(row)}
        <span style={{ ...groupLabel, marginTop: 8 }}>Open</span>
        {MOCK_TASKS.filter((t) => !t.overdue && !t.done).map(row)}
        <span style={{ ...groupLabel, marginTop: 8 }}>Done</span>
        {MOCK_TASKS.filter((t) => t.done).map(row)}
      </div>
    </div>
  );
}

/** Variant B rail card — approved pink-glow premium treatment (MiniBadge scale-up). */
function PremiumBadgeCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div style={{ position: "relative", paddingTop: 20 }}>
      <img
        src={wcShieldIcon}
        alt=""
        style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 38, height: "auto", zIndex: 2, pointerEvents: "none", filter: "drop-shadow(0 4px 10px rgba(233,30,140,0.55))" }}
      />
      <div style={{ borderRadius: 13, padding: 1.5, background: "#E91E8C", boxShadow: "0 0 18px rgba(233,30,140,0.40)" }}>
        <div style={{ borderRadius: 11.5, background: "#0a0a12", padding: "22px 10px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {value}
            {sub && <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginLeft: 3 }}>{sub}</span>}
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.18)", margin: "8px auto", maxWidth: 110 }} />
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", letterSpacing: "0.06em", whiteSpace: "nowrap", textTransform: "uppercase" }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

function RailVariantB() {
  const c = useThemeColors();
  const heading: React.CSSProperties = { fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: c.textMuted, fontWeight: 600 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <span style={heading}>Pricing</span>
      <PremiumBadgeCard value="$48,200" label="WC Annual Premium" sub="/yr" />
      <PremiumBadgeCard value="$2,350" label="PEO Admin Fee" sub="/mo" />
      <button style={{ width: "100%", textAlign: "center", fontSize: 12.5, borderRadius: 8, padding: "9px 8px", cursor: "pointer", fontWeight: 600, color: "#fff", background: "var(--gradient-cta)", border: "none", fontFamily: "inherit" }}>
        Modify Pricing
      </button>
      <span style={{ ...heading, marginTop: 4 }}>Submission Actions</span>
      <button style={{ width: "100%", textAlign: "center", fontSize: 13, borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600, color: c.textSecondary, border: `1px solid ${c.borderColor}`, background: "none", fontFamily: "inherit" }}>
        Approve
      </button>
      <button style={{ width: "100%", textAlign: "center", fontSize: 13, borderRadius: 8, padding: 10, cursor: "pointer", color: c.textSecondary, border: `1px solid ${c.borderColor}`, background: "none", fontFamily: "inherit", marginTop: -8 }}>
        Decline
      </button>
    </div>
  );
}

/** Refined badge card — accepts accentColor so WC and WFS are visually distinct. */
function RefinedBadgeCard({ value, sub, label, accentColor, glowColor, icon }: {
  value: string; sub: string; label: string; accentColor: string; glowColor: string; icon: string;
}) {
  return (
    <div style={{ position: "relative", paddingTop: 18 }}>
      <img
        src={icon}
        alt=""
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 34, height: "auto", zIndex: 2, pointerEvents: "none",
          filter: `drop-shadow(0 3px 10px ${glowColor})`,
        }}
      />
      <div style={{
        borderRadius: 12, padding: 1.5,
        background: accentColor,
        boxShadow: `0 0 20px ${glowColor}`,
      }}>
        <div style={{ borderRadius: 10.5, background: "#0a0a12", padding: "20px 12px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {value}
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginLeft: 2 }}>{sub}</span>
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`, margin: "9px auto 8px" }} />
          <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

function RailVariantBRefined() {
  const c = useThemeColors();
  const sectionLabel: React.CSSProperties = {
    fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
    color: c.textMuted, fontWeight: 700,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* WC pricing — pink/magenta badge */}
      <RefinedBadgeCard
        value="$48,200" sub="/yr"
        label="WC Annual Premium"
        accentColor="#E91E8C"
        glowColor="rgba(233,30,140,0.55)"
        icon={wcShieldIcon}
      />
      {/* WFS pricing — indigo badge for visual differentiation */}
      <RefinedBadgeCard
        value="$2,350" sub="/mo"
        label="WFS Monthly Fee · $68.40 PEPM"
        accentColor="#5b21b6"
        glowColor="rgba(91,33,182,0.55)"
        icon={wcShieldIcon}
      />

      {/* Ghost secondary CTA — pricing edit is not the primary action */}
      <button style={{
        width: "100%", fontSize: 12, borderRadius: 8, padding: "8px 8px",
        cursor: "pointer", fontWeight: 600, color: c.textSecondary,
        border: `1px solid ${c.borderColor}`, background: "transparent",
        fontFamily: "inherit", letterSpacing: "0.01em",
      }}>
        Modify Pricing
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: c.borderColor, margin: "2px 0" }} />

      <span style={sectionLabel}>Submission</span>

      {/* Approve — gradient CTA, it IS the primary action */}
      <button style={{
        width: "100%", fontSize: 13.5, borderRadius: 9, padding: "11px 8px",
        cursor: "pointer", fontWeight: 700, color: "#fff",
        background: "var(--gradient-cta)", border: "none",
        fontFamily: "inherit", letterSpacing: "0.01em",
      }}>
        Approve
      </button>

      {/* Decline — muted, clearly secondary */}
      <button style={{
        width: "100%", fontSize: 12.5, borderRadius: 9, padding: "9px 8px",
        cursor: "pointer", fontWeight: 500, color: c.textMuted,
        background: "transparent", border: `1px solid ${c.borderColor}`,
        fontFamily: "inherit", marginTop: -4,
      }}>
        Decline
      </button>

      {/* Inline blocker hint */}
      <div style={{ fontSize: 10.5, color: c.textMuted, textAlign: "center", marginTop: -4 }}>
        No open RFIs · ready to approve
      </div>
    </div>
  );
}

export default function DealCardLayoutMockup() {
  const c = useThemeColors();
  const [params] = useSearchParams();
  const variant = (params.get("v") === "b" ? "b" : params.get("v") === "b2" ? "b2" : "a") as "a" | "b" | "b2";

  return (
    <div style={{ minHeight: "100vh", background: c.isDark ? "#060608" : "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: 1200, height: 660, background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        {/* Slim header for context */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${c.borderColor}` }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: c.textPrimary, fontFamily: "Jost, sans-serif" }}>Green Valley Dispensary LLC</div>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#E91E8C", border: "1px solid rgba(233,30,140,0.4)", borderRadius: 9, padding: "2px 8px" }}>U/W Review</span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: c.textMuted, border: `1px solid ${c.borderColor}`, borderRadius: 9, padding: "2px 8px" }}>PEO</span>
          <div style={{ marginLeft: "auto", fontSize: 11, color: c.textMuted }}>
            Mockup {variant.toUpperCase()} — {variant === "a" ? "classic pricing cards in rail" : variant === "b" ? "premium badge rail" : "premium badge rail (refined)"}
          </div>
          <X style={{ width: 16, height: 16, color: c.textMuted }} />
        </div>

        {/* Body: left nav | content | right pricing rail */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Left sub-nav — Tasks restored as a tab */}
          <div style={{ width: 132, flexShrink: 0, borderRight: `1px solid ${c.borderColor}`, padding: "10px 0", overflow: "auto" }}>
            {NAV.map(({ key, label, Icon }) => {
              const active = key === "tasks";
              return (
                <div
                  key={key}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, width: "100%",
                    background: active ? c.accentPrimarySoft : "transparent",
                    borderLeft: `2px solid ${active ? "var(--accent-primary)" : "transparent"}`,
                    color: active ? c.textPrimary : c.textMuted, fontSize: 12, padding: "8px 14px", boxSizing: "border-box",
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: active ? "var(--accent-primary)" : c.textMuted }} />
                  {label}
                </div>
              );
            })}
          </div>

          {/* Content — Tasks tab shown active */}
          <div style={{ flex: 1, minWidth: 0, padding: 14, overflow: "auto" }}>
            <TasksTabContent />
          </div>

          {/* Right rail — pricing cards return here (replaces TaskDrawer) */}
          <div style={{ width: 264, flexShrink: 0, borderLeft: `1px solid ${c.borderColor}`, padding: 12, overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {variant === "a" ? (
              <PricingRail
                wcPremium="48200"
                wfsMonthly="2350"
                wfsPepm="68.40"
                canApprove
                busy={false}
                onApprove={() => {}}
                onDecline={() => {}}
                onModify={() => {}}
              />
            ) : variant === "b" ? (
              <RailVariantB />
            ) : (
              <RailVariantBRefined />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
