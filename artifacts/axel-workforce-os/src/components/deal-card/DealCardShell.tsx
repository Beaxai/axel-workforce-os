/**
 * Phase 4C — Deal Card collaboration hub shell (Stitch layout, Axel tokens).
 *
 * Layout: header (company + badges + deal-team avatars + close) → 6-phase macro
 * tracker (display-only, mapped from the binding pipeline) → KPI strip → body
 * [ left sub-nav | tab content | right rail (WC/WFS pricing + Approve/Decline) ].
 * The server computes section completeness and edit access; this shell only
 * renders + dispatches. Completeness lives on the Submission tab (per the
 * 2026-06-22 Stitch §8 update). Tokens only; verified light + dark.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X, Star, LayoutDashboard, ClipboardList, Folder, CheckSquare, Calculator, Shield, UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { useAuthStore } from "@/lib/auth-store";
import type { SectionView, SubmissionPayload, ActivityRow, SectionPatchResponse, RfiRow, RfiListResponse, QuoteVariation, QuoteVariationsResponse, ApplyVariationResponse, PreviewVariationResponse, VariationLevers, DealTeamMember } from "./types";
import UserMiniProfile from "@/components/user-profile/UserMiniProfile";
import type { CreateRfiInput } from "./OverviewTab";
import { PHASES, phaseIndex, isDeclined } from "./stage-map";
import DealHeaderMap from "./DealHeaderMap";
import { type GeoMarker, stateCentroid, zipToLngLat, spreadDuplicates } from "@/lib/geo";
import { STATUS_COLORS } from "./icons";
import OverviewTab from "./OverviewTab";
import SubmissionTab from "./SubmissionTab";
import PricingRail from "./PricingRail";
import ReRateBanner from "./ReRateBanner";
import SectionEditorOverlay from "./SectionEditorOverlay";
import { DocumentsTab, TasksTab, QuoteTab, PolicyTab } from "./SupportingTabs";

interface DealCardShellProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onDealUpdated?: () => void;
}

type TabKey = "overview" | "submission" | "documents" | "tasks" | "quote" | "policy";

const NAV: Array<{ key: TabKey; label: string; Icon: typeof LayoutDashboard }> = [
  { key: "overview", label: "Overview", Icon: LayoutDashboard },
  { key: "submission", label: "Submission", Icon: ClipboardList },
  { key: "documents", label: "Documents", Icon: Folder },
  { key: "tasks", label: "Tasks", Icon: CheckSquare },
  { key: "quote", label: "Quote", Icon: Calculator },
  { key: "policy", label: "Policy", Icon: Shield },
];

const INTERNAL = new Set(["ADMIN", "CSA", "AGENT", "UNDERWRITER"]);

function fieldValue(sections: SectionView[], sectionKey: string, fieldKey: string): unknown {
  const s = sections.find((x) => x.key === sectionKey);
  return s?.fields.find((f) => f.key === fieldKey)?.value ?? null;
}

function fmtNum(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString();
}

function fmtMoneyShort(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  const n = Number(v);
  if (isNaN(n) || n === 0) return "\u2014";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

/** Stock headshots used for a subset of deal-team members (rest get soft-grey acronym circles). */
const AVATAR_PHOTOS = [
  "/images/avatars/team_headshot_1.jpg",
  "/images/avatars/team_headshot_2.jpg",
  "/images/avatars/team_headshot_3.jpg",
  "/images/avatars/team_headshot_4.jpg",
];

const AVATAR_SIZE = 38;

/**
 * Deal-team avatar row (rendered under the company name, over the header map).
 * Every other member shows a stock headshot; the rest show soft-grey initials
 * circles that deliberately stay quiet against the map background. Each avatar
 * still opens the shared mini-profile popover.
 */
function DealTeamAvatars({ team }: { team?: DealTeamMember[] }) {
  const c = useThemeColors();
  const grey = c.isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.08)";
  const greyText = c.isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.6)";
  const ring = c.bg;
  const base: CSSProperties = {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: "50%",
    border: `2px solid ${ring}`, display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, overflow: "hidden",
  };
  if (!team || team.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ ...base, background: grey, marginLeft: i === 0 ? 0 : -10 }}>
            <UserRound style={{ width: 17, height: 17, color: greyText }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {team.map((m, i) => {
        const photo = i % 2 === 0 ? AVATAR_PHOTOS[Math.floor(i / 2) % AVATAR_PHOTOS.length] : null;
        return (
          <UserMiniProfile key={m.userId} userId={m.userId} align="start">
            <button
              type="button"
              title={`${m.name} · ${m.relation}`}
              style={{
                ...base,
                background: grey,
                marginLeft: i === 0 ? 0 : -10,
                cursor: "pointer", padding: 0,
                fontSize: 13, fontWeight: 600, color: greyText,
                position: "relative", zIndex: team.length - i,
              }}
            >
              {photo ? (
                <img
                  src={photo}
                  alt={m.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                teamInitials(m.name)
              )}
            </button>
          </UserMiniProfile>
        );
      })}
    </div>
  );
}

export default function DealCardShell({ dealId, isOpen, onClose, onDealUpdated }: DealCardShellProps) {
  const c = useThemeColors();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [payload, setPayload] = useState<SubmissionPayload | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [rfis, setRfis] = useState<RfiRow[]>([]);
  const [openBlocking, setOpenBlocking] = useState(0);
  const [rfiBusy, setRfiBusy] = useState(false);
  const [variations, setVariations] = useState<QuoteVariation[]>([]);
  const [basePremium, setBasePremium] = useState(0);
  const [baseLevers, setBaseLevers] = useState<VariationLevers | null>(null);
  const [varHasQuote, setVarHasQuote] = useState(true);
  const [varUsedAi, setVarUsedAi] = useState(false);
  const [varLoading, setVarLoading] = useState(false);
  const [varApplying, setVarApplying] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const [posting, setPosting] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [mapMarkers, setMapMarkers] = useState<GeoMarker[]>([]);

  const isInternal = !!user && INTERNAL.has(user.role);
  const canPost = !!user && (isInternal || user.role === "EMPLOYER");

  const fetchSubmission = useCallback(async () => {
    try {
      const res = await api.get<SubmissionPayload>(`/deal-card/${dealId}/submission`);
      setPayload(res);
    } catch {
      setPayload(null);
    }
  }, [dealId]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.get<{ activity: ActivityRow[] }>(`/deal-card/${dealId}/activity`);
      setActivity(res.activity || []);
    } catch {
      setActivity([]);
    }
  }, [dealId]);

  const fetchRfis = useCallback(async () => {
    try {
      const res = await api.get<RfiListResponse>(`/deal-card/${dealId}/rfis`);
      setRfis(res.rfis || []);
      setOpenBlocking(res.openBlocking || 0);
    } catch {
      setRfis([]);
      setOpenBlocking(0);
    }
  }, [dealId]);

  const fetchVariations = useCallback(async () => {
    setVarLoading(true);
    try {
      const res = await api.get<QuoteVariationsResponse>(`/deal-card/${dealId}/quote-variations`);
      setVarHasQuote(res.hasQuote);
      setBasePremium(res.basePremium || 0);
      setBaseLevers(res.baseLevers ?? null);
      setVariations(res.variations || []);
      setVarUsedAi(res.usedAi);
    } catch {
      setVariations([]);
      setVarHasQuote(false);
    } finally {
      setVarLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (!isOpen || !dealId) return;
    setPayload(null);
    setActivity([]);
    setRfis([]);
    setOpenBlocking(0);
    setApproveError(null);
    setVariations([]);
    setBasePremium(0);
    setBaseLevers(null);
    setVarHasQuote(true);
    setVarUsedAi(false);
    setTab("overview");
    setOpenSection(null);
    setMapMarkers([]);
    fetchSubmission();
    fetchActivity();
    fetchRfis();
  }, [isOpen, dealId, fetchSubmission, fetchActivity, fetchRfis]);

  const sections = payload?.sections ?? [];
  const deal = payload?.deal;

  // Resolve header-map markers: prefer the quote's workforce profile (per-location
  // state/zip + class-code headcounts); fall back to the deal-level state, dividing
  // the FT employee count evenly across numberOfLocations when the per-location
  // split is unknown.
  useEffect(() => {
    if (!isOpen || !dealId || !deal) return;
    let active = true;
    (async () => {
      type RawLoc = { state?: string; zip?: string; employees: number };
      let locs: RawLoc[] = [];
      try {
        const q = await api.get<{
          workforceProfile?: {
            locations?: Array<{
              state?: string; zip?: string;
              classCodes?: Array<{ fullTimeEmployees?: number; partTimeEmployees?: number }>;
            }>;
          };
        }>(`/quotes/by-deal/${dealId}`);
        const wpl = q?.workforceProfile?.locations;
        if (Array.isArray(wpl) && wpl.length > 0) {
          locs = wpl.map((l) => ({
            state: l.state,
            zip: l.zip,
            employees: (l.classCodes ?? []).reduce(
              (s, cc) => s + (Number(cc.fullTimeEmployees) || 0) + (Number(cc.partTimeEmployees) || 0),
              0,
            ),
          }));
        }
      } catch {
        /* no quote for this deal — fall back to deal-level fields */
      }
      if (locs.length === 0) {
        const st = deal.state;
        if (!st) { if (active) setMapMarkers([]); return; }
        const n = Math.max(1, Number(deal.numberOfLocations) || 1);
        locs = Array.from({ length: n }, () => ({ state: st, employees: 0 }));
      }
      // Even split when we know a total headcount but not the per-location breakdown.
      if (locs.every((l) => l.employees === 0)) {
        const total = Number(deal.employeeCountFt) || 0;
        if (total > 0) {
          const per = Math.max(1, Math.round(total / locs.length));
          locs = locs.map((l) => ({ ...l, employees: per }));
        }
      }
      const points = await Promise.all(
        locs.map(async (l) => (l.zip ? await zipToLngLat(l.zip) : null) ?? stateCentroid(l.state)),
      );
      const resolved: GeoMarker[] = [];
      points.forEach((pt, i) => {
        if (pt) resolved.push({ lng: pt[0], lat: pt[1], employees: locs[i].employees });
      });
      if (active) setMapMarkers(spreadDuplicates(resolved));
    })();
    return () => { active = false; };
  }, [isOpen, dealId, deal]);

  const editorSection = useMemo(
    () => (openSection ? sections.find((s) => s.key === openSection) ?? null : null),
    [openSection, sections],
  );

  const handleSaveSection = async (fields: Record<string, unknown>) => {
    if (!openSection) return;
    if (Object.keys(fields).length === 0) {
      setOpenSection(null);
      return;
    }
    setSavingSection(true);
    try {
      const res = await api.patch<SectionPatchResponse>(`/deal-card/${dealId}/submission/${openSection}`, { fields });
      if (res.sections) {
        setPayload((p) => (p ? { ...p, sections: res.sections!, aggregateComplete: res.aggregateComplete ?? p.aggregateComplete, total: res.total ?? p.total, deal: res.deal ?? p.deal } : p));
      } else {
        await fetchSubmission();
      }
      await fetchActivity();
      onDealUpdated?.();
      setOpenSection(null);
    } catch {
      /* validation errors surface as a no-op; keep the editor open */
    } finally {
      setSavingSection(false);
    }
  };

  const handleSend = async (message: string) => {
    setPosting(true);
    try {
      await api.post(`/deal-card/${dealId}/messages`, { message });
      await fetchActivity();
    } catch {
      /* ignore */
    } finally {
      setPosting(false);
    }
  };

  const handleApprove = async () => {
    setDecisionBusy(true);
    setApproveError(null);
    try {
      await api.post(`/deal-card/${dealId}/approve`, {});
      await fetchSubmission();
      await fetchActivity();
      onDealUpdated?.();
    } catch (e) {
      // Server returns 409 with a human message when a blocking RFI is open.
      let msg = "Could not approve.";
      try {
        const parsed = JSON.parse((e as Error).message);
        if (typeof parsed === "string") msg = parsed;
      } catch {
        const raw = (e as Error).message;
        if (raw && !raw.startsWith("API ")) msg = raw;
      }
      setApproveError(msg);
      await fetchRfis();
    } finally {
      setDecisionBusy(false);
    }
  };

  const handleCreateRfi = async (input: CreateRfiInput) => {
    setRfiBusy(true);
    try {
      await api.post(`/deal-card/${dealId}/rfis`, input);
      await fetchRfis();
      await fetchActivity();
    } catch {
      /* ignore */
    } finally {
      setRfiBusy(false);
    }
  };

  const handleResolveRfi = async (rfiId: string, status: "RESOLVED" | "WAIVED", note?: string) => {
    setRfiBusy(true);
    try {
      await api.post(`/deal-card/${dealId}/rfis/${rfiId}/resolve`, { status, note });
      await fetchRfis();
      await fetchActivity();
      setApproveError(null);
    } catch {
      /* ignore */
    } finally {
      setRfiBusy(false);
    }
  };

  const handleApplyVariation = async (v: QuoteVariation) => {
    setVarApplying(v.id);
    try {
      const body: VariationLevers & { label: string } = { ...v.changes, label: v.label };
      await api.post<ApplyVariationResponse>(`/deal-card/${dealId}/quote-variations/apply`, body);
      await fetchVariations();
      await fetchSubmission();
      await fetchActivity();
      onDealUpdated?.();
    } catch {
      /* ignore */
    } finally {
      setVarApplying(null);
    }
  };

  const handlePreviewLevers = useCallback(
    (levers: VariationLevers) =>
      api.post<PreviewVariationResponse>(`/deal-card/${dealId}/quote-variations/preview`, levers),
    [dealId],
  );

  const handleApplyLevers = async (levers: VariationLevers, label: string) => {
    setVarApplying("what-if");
    try {
      const body: VariationLevers & { label: string } = { ...levers, label };
      await api.post<ApplyVariationResponse>(`/deal-card/${dealId}/quote-variations/apply`, body);
      await fetchVariations();
      await fetchSubmission();
      await fetchActivity();
      onDealUpdated?.();
    } catch {
      /* ignore */
    } finally {
      setVarApplying(null);
    }
  };

  const handleDecline = async (reason: string) => {
    setDecisionBusy(true);
    try {
      await api.post(`/deal-card/${dealId}/decline`, { reason });
      await fetchSubmission();
      await fetchActivity();
      onDealUpdated?.();
    } catch {
      /* ignore */
    } finally {
      setDecisionBusy(false);
    }
  };

  const handleReRate = async () => {
    try {
      await api.post(`/deal-card/${dealId}/clear-rating-stale`, {});
    } catch {
      /* ignore */
    }
    onClose();
    navigate("/marketplace");
  };

  if (!isOpen) return null;

  const stage = deal?.stage;
  const currentPhase = phaseIndex(stage);
  const declined = isDeclined((deal as { outcome?: string } | undefined)?.outcome);
  const effectiveDate = deal?.coverageEffectiveDate ? new Date(String(deal.coverageEffectiveDate)).toLocaleDateString() : null;

  const badges = [deal?.vertical, deal?.productType].filter(Boolean) as string[];

  const kpis = [
    { label: "LOCATIONS", value: fmtNum(fieldValue(sections, "locations", "numberOfLocations")), accent: false },
    { label: "EMPLOYEES", value: fmtNum(fieldValue(sections, "workforce", "employeeCountFt")), accent: false },
    { label: "ANNUAL PAYROLL", value: fmtMoneyShort(fieldValue(sections, "workforce", "annualPayroll")), accent: true },
    { label: "EXMOD", value: (() => { const e = fieldValue(sections, "workforce", "emod"); return e == null || e === "" ? "\u2014" : String(e); })(), accent: true },
  ];

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "var(--overlay-bg)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
    >
      <div
        style={{
          width: "100%", maxWidth: 1040, maxHeight: "92vh", display: "flex", flexDirection: "column",
          background: c.bg, color: c.textPrimary, border: `1px solid ${c.borderColor}`, borderRadius: 16, overflow: "hidden",
          fontFamily: "var(--app-font-sans)",
        }}
      >
        {/* Header — minimalist US map background (location markers) + company identity + deal team */}
        <div style={{ position: "relative", minHeight: 158, borderBottom: `1px solid ${c.borderColor}`, overflow: "hidden", background: c.isDark ? "#0b0b0f" : "#ececf0", flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <DealHeaderMap markers={mapMarkers} />
          </div>
          {/* left-to-right legibility gradient so the text sits comfortably over the map */}
          <div
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: c.isDark
                ? "linear-gradient(90deg, rgba(6,6,8,0.9) 0%, rgba(6,6,8,0.55) 42%, rgba(6,6,8,0.06) 100%)"
                : "linear-gradient(90deg, rgba(244,244,245,0.93) 0%, rgba(244,244,245,0.6) 42%, rgba(244,244,245,0.06) 100%)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 18px 14px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Star style={{ width: 18, height: 18, color: c.textMuted }} />
                <div style={{ fontSize: 18, fontWeight: 600 }}>{deal?.businessName || "Deal"}</div>
              </div>
              {(badges.length > 0 || effectiveDate) && (
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {badges.map((b) => (
                    <span key={b} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: c.cardBg, color: c.textMuted, border: `1px solid ${c.borderColor}` }}>{b}</span>
                  ))}
                  {effectiveDate && (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: c.accentPrimarySoft, color: "var(--accent-primary)", border: `1px solid ${c.accentPrimarySoft}`, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>
                      Effective {effectiveDate}
                    </span>
                  )}
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <DealTeamAvatars team={payload?.team} />
              </div>
            </div>
            <X onClick={onClose} style={{ width: 18, height: 18, color: c.textMuted, cursor: "pointer", flexShrink: 0 }} />
          </div>
        </div>

        {/* 6-phase macro tracker (display-only) */}
        <div style={{ display: "flex", alignItems: "flex-start", padding: "16px 18px 12px", borderBottom: `1px solid ${c.borderColor}` }}>
          {PHASES.map((label, i) => {
            const done = i < currentPhase;
            const current = i === currentPhase;
            const declinedNode = current && declined;
            const nodeColor = declinedNode ? "#ef4444" : current ? "var(--accent-primary)" : done ? STATUS_COLORS.complete : c.borderColor;
            const lblColor = declinedNode ? "#ef4444" : current ? "var(--accent-primary)" : done ? STATUS_COLORS.complete : c.textMuted;
            return (
              <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", minWidth: 0 }}>
                {i > 0 && <div style={{ position: "absolute", top: 5, left: "-50%", width: "100%", height: 2, background: i <= currentPhase ? STATUS_COLORS.complete : c.borderColor }} />}
                <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${nodeColor}`, background: done || current ? nodeColor : c.bg, position: "relative", zIndex: 1, boxShadow: current ? `0 0 0 4px ${c.accentPrimarySoft}` : "none" }} />
                <span style={{ fontSize: 10, marginTop: 8, color: lblColor, textAlign: "center", lineHeight: 1.3, maxWidth: 92, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 }}>
                  {declinedNode ? "Declined" : label}
                </span>
              </div>
            );
          })}
        </div>

        {/* KPI strip */}
        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderBottom: `1px solid ${c.borderColor}` }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ flex: 1, background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: "8px 11px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.06em", color: c.textMuted }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 500, marginTop: 1, color: k.accent ? "var(--accent-primary)" : c.textPrimary }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Left sub-nav */}
          <div style={{ width: 132, flexShrink: 0, borderRight: `1px solid ${c.borderColor}`, padding: "10px 0", overflow: "auto" }}>
            {NAV.map(({ key, label, Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
                    background: active ? c.accentPrimarySoft : "transparent", border: "none",
                    borderLeft: `2px solid ${active ? "var(--accent-primary)" : "transparent"}`,
                    color: active ? c.textPrimary : c.textMuted, fontFamily: "inherit", fontSize: 12, padding: "8px 14px", cursor: "pointer",
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: active ? "var(--accent-primary)" : c.textMuted }} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0, padding: 14, overflow: "auto" }}>
            {!payload ? (
              <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: c.textMuted }}>Loading deal\u2026</div>
            ) : (
              <>
                {tab === "submission" && <ReRateBanner show={!!deal?.ratingStale} onReRate={handleReRate} />}
                {tab === "overview" && (
                  <OverviewTab
                    activity={activity}
                    canPost={canPost}
                    posting={posting}
                    onSend={handleSend}
                    rfis={rfis}
                    isInternal={isInternal}
                    rfiBusy={rfiBusy}
                    onCreateRfi={handleCreateRfi}
                    onResolveRfi={handleResolveRfi}
                    variations={variations}
                    basePremium={basePremium}
                    baseLevers={baseLevers}
                    varHasQuote={varHasQuote}
                    varUsedAi={varUsedAi}
                    varLoading={varLoading}
                    varApplying={varApplying}
                    onGenerateVariations={fetchVariations}
                    onApplyVariation={handleApplyVariation}
                    onPreviewLevers={handlePreviewLevers}
                    onApplyLevers={handleApplyLevers}
                  />
                )}
                {tab === "submission" && <SubmissionTab sections={sections} aggregateComplete={payload.aggregateComplete} total={payload.total} onOpenSection={setOpenSection} />}
                {tab === "documents" && <DocumentsTab dealId={dealId} />}
                {tab === "tasks" && <TasksTab dealId={dealId} />}
                {tab === "quote" && <QuoteTab dealId={dealId} businessName={deal?.businessName || ""} productType={deal?.productType} onClose={onClose} />}
                {tab === "policy" && <PolicyTab dealId={dealId} bindStatus={deal?.bindStatus} />}
              </>
            )}
          </div>

          {/* Right rail */}
          {payload && (
            <div style={{ width: 224, flexShrink: 0, borderLeft: `1px solid ${c.borderColor}`, padding: "14px 14px 18px", display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
              <PricingRail
                wcPremium={(deal?.wcPremium as string) ?? null}
                wfsMonthly={null}
                wfsPepm={(deal?.wfsPepmRate as string) ?? null}
                canApprove={payload.canApprove}
                busy={decisionBusy}
                openBlocking={openBlocking}
                approveError={approveError}
                onApprove={handleApprove}
                onDecline={handleDecline}
                onModify={() => setTab("quote")}
              />
            </div>
          )}
        </div>
      </div>

      {/* Section editor overlay */}
      <SectionEditorOverlay
        section={editorSection}
        canEdit={!!editorSection && !!payload?.access[editorSection.key]}
        saving={savingSection}
        onClose={() => setOpenSection(null)}
        onSave={handleSaveSection}
      />
    </div>,
    document.body,
  );
}
