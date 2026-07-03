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
  MapPin, Users, Banknote, Gauge,
} from "lucide-react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { useAuthStore } from "@/lib/auth-store";
import type { SectionView, SubmissionPayload, ActivityRow, SectionPatchResponse, RfiRow, RfiListResponse, QuoteVariation, QuoteVariationsResponse, ApplyVariationResponse, PreviewVariationResponse, VariationLevers, DealTeamMember } from "./types";
import UserMiniProfile from "@/components/user-profile/UserMiniProfile";
import type { CreateRfiInput } from "./OverviewTab";
import { PHASES, phaseIndex, isDeclined } from "./stage-map";
import DealHeaderMap, { type MarkerClickInfo } from "./DealHeaderMap";
import { type GeoMarker, stateCentroid, zipToLngLat, spreadDuplicates } from "@/lib/geo";
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
  // KPI fallbacks sourced from the deal's quote workforce profile (the deal-level
  // columns are often unset when the deal was created from the quote flow).
  const [quoteStats, setQuoteStats] = useState<{ locations: number | null; eMod: number | null }>({ locations: null, eMod: null });
  // Marker popup: which location detail panel is open + where to anchor it.
  const [markerPopup, setMarkerPopup] = useState<{ marker: GeoMarker; info: MarkerClickInfo } | null>(null);

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
    setQuoteStats({ locations: null, eMod: null });
    setMarkerPopup(null);
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
      type RawLoc = {
        state?: string; zip?: string; employees: number;
        classCodes?: GeoMarker["classCodes"];
      };
      let locs: RawLoc[] = [];
      let stats: { locations: number | null; eMod: number | null } = { locations: null, eMod: null };
      try {
        const q = await api.get<{
          workforceProfile?: {
            eMod?: number;
            locations?: Array<{
              state?: string; zip?: string;
              classCodes?: Array<{
                classCode?: string; description?: string; annualPayroll?: number;
                fullTimeEmployees?: number; partTimeEmployees?: number;
              }>;
            }>;
          };
        }>(`/quotes/by-deal/${dealId}`);
        const wp = q?.workforceProfile;
        const wpl = wp?.locations;
        if (Array.isArray(wpl) && wpl.length > 0) {
          locs = wpl.map((l) => ({
            state: l.state,
            zip: l.zip,
            employees: (l.classCodes ?? []).reduce(
              (s, cc) => s + (Number(cc.fullTimeEmployees) || 0) + (Number(cc.partTimeEmployees) || 0),
              0,
            ),
            classCodes: (l.classCodes ?? []).map((cc) => ({
              code: String(cc.classCode ?? ""),
              description: cc.description,
              ft: Number(cc.fullTimeEmployees) || 0,
              pt: Number(cc.partTimeEmployees) || 0,
              payroll: Number(cc.annualPayroll) || undefined,
            })),
          }));
          stats = {
            locations: wpl.length,
            eMod: typeof wp?.eMod === "number" ? wp.eMod : null,
          };
        }
      } catch {
        /* no quote for this deal — fall back to deal-level fields */
      }
      if (active) setQuoteStats(stats);
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
        const l = locs[i];
        if (pt) resolved.push({
          lng: pt[0], lat: pt[1], employees: l.employees,
          label: [l.state, l.zip].filter(Boolean).join(" ") || undefined,
          classCodes: l.classCodes,
        });
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

  // Deal-level columns first, then quote workforce-profile fallbacks (deals
  // created via the quote flow often never backfill numberOfLocations / emod).
  const locationsVal = fieldValue(sections, "locations", "numberOfLocations") ?? quoteStats.locations ?? (mapMarkers.length > 0 ? mapMarkers.length : null);
  const exModRaw = fieldValue(sections, "workforce", "emod") ?? quoteStats.eMod;
  const exModVal = exModRaw == null || exModRaw === "" || isNaN(Number(exModRaw)) ? null : Number(exModRaw).toFixed(2);

  const kpis = [
    { label: "LOCATIONS", Icon: MapPin, value: fmtNum(locationsVal) },
    { label: "EMPLOYEES", Icon: Users, value: fmtNum(fieldValue(sections, "workforce", "employeeCountFt")) },
    { label: "PAYROLL", Icon: Banknote, value: fmtMoneyShort(fieldValue(sections, "workforce", "annualPayroll")) },
    { label: "EXMOD", Icon: Gauge, value: exModVal ?? "\u2014" },
  ];

  // Header-over-map palette: glyphs sit on the map artwork, so these branch on
  // theme like the map itself (intentional artwork greys, not surface tokens).
  const hdrValue = c.isDark ? "#ffffff" : "#17171d";
  const hdrValueGlow = c.isDark ? "0 0 14px rgba(255,255,255,0.35)" : "none";
  const hdrSoftGrey = c.isDark ? "#9b9ba4" : "#7c7c86";
  const hdrFaint = c.isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)";
  const hdrGlowNode = c.isDark ? "#ffffff" : "#17171d";
  const hdrNodeGlow = c.isDark
    ? "0 0 10px rgba(255,255,255,0.65), 0 0 0 4px rgba(255,255,255,0.10)"
    : "0 0 10px rgba(23,23,29,0.45), 0 0 0 4px rgba(23,23,29,0.08)";

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
        {/* Header — minimalist US map background running behind identity, KPIs
            AND the milestone tracker; deal-team avatars under the name. */}
        <div style={{ position: "relative", minHeight: 248, display: "flex", flexDirection: "column", borderBottom: `1px solid ${c.borderColor}`, overflow: "hidden", background: c.isDark ? "#0b0b0f" : "#ececf0", flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <DealHeaderMap
              markers={mapMarkers}
              onMarkerClick={(marker, info) => setMarkerPopup((prev) => (prev && prev.marker === marker ? null : { marker, info }))}
              onBackgroundClick={() => setMarkerPopup(null)}
            />
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
          {/* top-right vignette so the KPI numbers read over raw map */}
          <div
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: c.isDark
                ? "linear-gradient(270deg, rgba(6,6,8,0.72) 0%, rgba(6,6,8,0.30) 34%, rgba(6,6,8,0) 58%)"
                : "linear-gradient(270deg, rgba(244,244,245,0.82) 0%, rgba(244,244,245,0.4) 34%, rgba(244,244,245,0) 58%)",
            }}
          />
          {/* bottom band so the milestone labels read over the map */}
          <div
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: c.isDark
                ? "linear-gradient(0deg, rgba(6,6,8,0.82) 0%, rgba(6,6,8,0.38) 26%, rgba(6,6,8,0) 46%)"
                : "linear-gradient(0deg, rgba(244,244,245,0.88) 0%, rgba(244,244,245,0.45) 26%, rgba(244,244,245,0) 46%)",
            }}
          />
          {/* pointerEvents: none on the row so clicks fall through to the map;
              re-enabled on the interactive children. */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "16px 18px 0", pointerEvents: "none" }}>
            <div style={{ flex: "1 1 260px", minWidth: 0, pointerEvents: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Star style={{ width: 18, height: 18, color: c.textMuted, flexShrink: 0 }} />
                <div style={{ fontSize: 18, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deal?.businessName || "Deal"}</div>
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
            {/* KPI cluster — large glowing numbers with identifying icons, left of the X.
                Wraps under the identity block on narrow widths instead of colliding. */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "flex-end", columnGap: 26, rowGap: 10, flex: "0 1 auto", minWidth: 0, pointerEvents: "auto" }}>
              {kpis.map(({ label, Icon, value }) => (
                <div key={label} style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, fontSize: 10, letterSpacing: "0.08em", fontWeight: 600, color: hdrSoftGrey, textTransform: "uppercase" }}>
                    <Icon style={{ width: 13, height: 13, color: hdrSoftGrey }} />
                    {label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.15, marginTop: 3, color: hdrValue, textShadow: hdrValueGlow, fontVariantNumeric: "tabular-nums" }}>
                    {value}
                  </div>
                </div>
              ))}
              <X onClick={onClose} style={{ width: 18, height: 18, color: c.textMuted, cursor: "pointer", flexShrink: 0, marginTop: 1 }} />
            </div>
          </div>

          {/* 6-phase macro tracker (display-only) — map continues behind it.
              Completed = soft grey; current = hollow glowing node.
              marginTop: auto pins it to the bottom of the taller header so the
              map dots get breathing room; pointerEvents: none lets clicks reach
              the markers behind it. */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", padding: "18px 18px 12px", marginTop: "auto", pointerEvents: "none" }}>
            {PHASES.map((label, i) => {
              const done = i < currentPhase;
              const current = i === currentPhase;
              const declinedNode = current && declined;
              const nodeColor = declinedNode ? "#ef4444" : current ? hdrGlowNode : done ? hdrSoftGrey : hdrFaint;
              const lblColor = declinedNode ? "#ef4444" : current ? hdrValue : done ? hdrSoftGrey : c.textMuted;
              return (
                <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", minWidth: 0 }}>
                  {i > 0 && <div style={{ position: "absolute", top: 5, left: "-50%", width: "100%", height: 2, background: i <= currentPhase ? hdrSoftGrey : hdrFaint }} />}
                  <span
                    style={{
                      width: 12, height: 12, borderRadius: "50%", border: `2px solid ${nodeColor}`,
                      background: done ? hdrSoftGrey : "transparent",
                      position: "relative", zIndex: 1,
                      boxShadow: current ? hdrNodeGlow : "none",
                    }}
                  />
                  <span style={{ fontSize: 10, marginTop: 8, color: lblColor, textAlign: "center", lineHeight: 1.3, maxWidth: 92, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500, textShadow: current ? hdrValueGlow : "none" }}>
                    {declinedNode ? "Declined" : label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Location detail popup — anchored to the clicked map marker. */}
          {markerPopup && (() => {
            const { marker, info } = markerPopup;
            const W = 280;
            const left = Math.max(12, Math.min(info.x - W / 2, info.containerW - W - 12));
            const below = info.y < info.containerH / 2;
            // Vertical clamp: anchor edge stays within the header so at least
            // ~100px of the (scrollable) panel is always visible.
            const MIN_VISIBLE = 100;
            const anchor = below
              ? Math.max(12, Math.min(info.y + 16, info.containerH - 12 - MIN_VISIBLE))
              : Math.max(12, Math.min(info.containerH - info.y + 16, info.containerH - 12 - MIN_VISIBLE));
            const totalFt = (marker.classCodes ?? []).reduce((s, cc) => s + cc.ft, 0);
            const totalPt = (marker.classCodes ?? []).reduce((s, cc) => s + cc.pt, 0);
            return (
              <div
                role="dialog"
                aria-label={`Location detail: ${marker.label ?? "location"}`}
                style={{
                  position: "absolute", zIndex: 3, left, width: W,
                  ...(below ? { top: anchor } : { bottom: anchor }),
                  maxHeight: info.containerH - anchor - 12, overflowY: "auto",
                  background: c.isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
                  border: `1px solid ${c.borderColor}`, borderRadius: 12,
                  boxShadow: c.isDark
                    ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"
                    : "0 24px 80px rgba(0,0,0,0.18)",
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>{marker.label ?? "Location"}</div>
                    <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                      {marker.employees.toLocaleString()} employees
                      {totalPt > 0 ? ` \u00b7 ${totalFt} FT / ${totalPt} PT` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => setMarkerPopup(null)}
                    aria-label="Close location detail"
                    style={{ background: "transparent", border: "none", color: c.textMuted, cursor: "pointer", padding: 2, lineHeight: 0, flexShrink: 0 }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                {(marker.classCodes ?? []).length === 0 ? (
                  <div style={{ fontSize: 12, color: c.textMuted }}>No employee type breakdown available for this location.</div>
                ) : (
                  (marker.classCodes ?? []).map((cc, i) => (
                    <div key={i} style={{ padding: "8px 0", borderTop: i > 0 ? `1px solid ${c.borderColor}` : "none" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: c.textPrimary, lineHeight: 1.35 }}>
                        {cc.description || `Class ${cc.code}`}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 3, fontSize: 11, color: c.textMuted }}>
                        <span>
                          {cc.code ? `Class ${cc.code} \u00b7 ` : ""}
                          {cc.ft} FT{cc.pt > 0 ? ` / ${cc.pt} PT` : ""}
                        </span>
                        {cc.payroll ? <span>${cc.payroll.toLocaleString()} payroll</span> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })()}
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
