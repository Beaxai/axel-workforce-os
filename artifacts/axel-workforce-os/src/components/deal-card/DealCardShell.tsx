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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import GhostButton from "@/components/ui/GhostButton";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X, Star, LayoutDashboard, ClipboardList, Folder, Calculator, Shield,
  MapPin, Users, Banknote, Gauge, ShieldCheck, CheckSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { useAuthStore } from "@/lib/auth-store";
import type { SectionView, SubmissionPayload, ActivityRow, SectionPatchResponse, RfiRow, RfiListResponse, QuoteVariation, QuoteVariationsResponse, ApplyVariationResponse, PreviewVariationResponse, VariationLevers, DealTeamMember, DealDirectoryEntry } from "./types";
import UserMiniProfile from "@/components/user-profile/UserMiniProfile";
import type { CreateRfiInput } from "./OverviewTab";
import { PHASES, phaseIndex } from "./stage-map";
import DealHeaderMap, { type MarkerClickInfo } from "./DealHeaderMap";
import { type GeoMarker, type GeoMarkerClassCode, stateCentroid, zipToLngLat, spreadDuplicates } from "@/lib/geo";
import LocationPopup from "./LocationPopup";
import OverviewTab from "./OverviewTab";
import SubmissionTab from "./SubmissionTab";
import SubjectivitiesTab from "./SubjectivitiesTab";
import PricingRail from "./PricingRail";
import DepositCard from "./DepositCard";
import ReRateBanner from "./ReRateBanner";
import { DocumentsTab, QuoteTab, PolicyTab, TasksTab } from "./SupportingTabs";

import type { IndicationMetric } from "./IndicationDetailView";

interface DealCardShellProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onDealUpdated?: () => void;
}

type TabKey = "overview" | "submission" | "subjectivities" | "documents" | "quote" | "policy" | "tasks";

const NAV: Array<{ key: TabKey; label: string; Icon: typeof LayoutDashboard }> = [
  { key: "overview", label: "Overview", Icon: LayoutDashboard },
  { key: "submission", label: "Submission", Icon: ClipboardList },
  // §6A bind subjectivities — generated when the deal reaches Bind Order.
  { key: "subjectivities", label: "Subjectivities", Icon: ShieldCheck },
  { key: "documents", label: "Documents", Icon: Folder },
  { key: "quote", label: "Quote", Icon: Calculator },
  { key: "policy", label: "Policy", Icon: Shield },
  { key: "tasks", label: "Tasks", Icon: CheckSquare },
];

const INTERNAL = new Set(["ADMIN", "CSA", "AGENT", "UNDERWRITER"]);

/** Raw workforce-profile JSON as stored on the quote (extra keys preserved). */
interface WorkforceProfileClassCodeRaw {
  classCode?: string;
  description?: string;
  annualPayroll?: number;
  fullTimeEmployees?: number;
  partTimeEmployees?: number;
  [key: string]: unknown;
}
interface WorkforceProfileLocationRaw {
  state?: string;
  zip?: string;
  classCodes?: WorkforceProfileClassCodeRaw[];
  [key: string]: unknown;
}
interface WorkforceProfileRaw {
  eMod?: number;
  locations?: WorkforceProfileLocationRaw[];
  [key: string]: unknown;
}

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

const AVATAR_SIZE = 38;

/**
 * Deal-team avatar row (rendered under the company name, over the header map).
 * Members with a real headshot (users.avatar_url) show the photo; the rest show
 * soft-grey initials circles that stay quiet against the map background. When a
 * deal has no explicit team, we fall back to the first three entries of the
 * deal-scoped directory (same people the Pipeline card face renders), so the
 * two surfaces always match — and it works for external roles too, who cannot
 * call the internal-sales-gated GET /api/users.
 * Each avatar still opens the shared mini-profile popover.
 */
function DealTeamAvatars({ team, directory }: { team?: DealTeamMember[]; directory?: DealDirectoryEntry[] }) {
  const c = useThemeColors();
  const grey = c.isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.08)";
  const greyText = c.isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.6)";
  const ring = c.bg;
  const base: CSSProperties = {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: "50%",
    border: `2px solid ${ring}`, display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, overflow: "hidden",
  };
  // Same people as the Pipeline card face: real team when present, otherwise
  // the first three directory members (matching the card-face avatar row).
  const people: Array<{ userId: string; name: string; relation?: string; photo: string | null }> =
    team && team.length > 0
      ? team.map((m) => ({ userId: m.userId, name: m.name, relation: m.relation, photo: m.avatarUrl ?? null }))
      : (directory ?? []).slice(0, 3).map((m) => ({ userId: m.id, name: m.name, photo: m.avatarUrl }));
  if (people.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {people.map((m, i) => (
        <UserMiniProfile key={m.userId} userId={m.userId} align="start">
          <button
            type="button"
            title={m.relation ? `${m.name} · ${m.relation}` : m.name}
            style={{
              ...base,
              background: grey,
              marginLeft: i === 0 ? 0 : -10,
              cursor: "pointer", padding: 0,
              fontSize: 13, fontWeight: 600, color: greyText,
              position: "relative", zIndex: people.length - i,
            }}
          >
            {m.photo ? (
              <img
                src={m.photo}
                alt={m.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              teamInitials(m.name)
            )}
          </button>
        </UserMiniProfile>
      ))}
    </div>
  );
}

/** EXMOD health dot — three-tier good / medium / bad scale (Status Dot design).
 *  Below 1.00 is better-than-average loss experience (good), up to 1.25 is
 *  watch territory (medium), above that is bad. Hex colors so the soft-glow
 *  shadow (`${color}55`) stays a valid 8-digit hex. */
function exModColor(value: number): string {
  if (value > 1.25) return "#ef4444"; // bad (red)
  if (value > 1.0) return "#FFB547"; // medium (amber)
  return "#00D68F"; // good (green)
}

export default function DealCardShell({ dealId, isOpen, onClose, onDealUpdated }: DealCardShellProps) {
  const c = useThemeColors();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // Note: no path-change close effect here — the URL-driven host
  // (GlobalDealCardHost) owns the open/close lifecycle via the ?deal= param.
  // Navigating away drops the param, which closes the card without touching
  // history (so Back can restore the exact card).

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
  // Which indication detail view (if any) the Quote tab shows — set by
  // clicking a header KPI; cleared by the detail view's back action.
  const [quoteDetail, setQuoteDetail] = useState<IndicationMetric | null>(null);
  // Header-KPI → Submission tab deep link (section + field to highlight).
  const [submissionFocus, setSubmissionFocus] = useState<{ section: string; field?: string; token: number } | null>(null);
  // Bumped after indication-parameter edits so quote-derived header state
  // (KPI fallbacks, map markers) refetches.
  const [quoteVersion, setQuoteVersion] = useState(0);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [mapMarkers, setMapMarkers] = useState<GeoMarker[]>([]);
  // KPI fallbacks sourced from the deal's quote workforce profile (the deal-level
  // columns are often unset when the deal was created from the quote flow).
  const [quoteStats, setQuoteStats] = useState<{ locations: number | null; eMod: number | null }>({ locations: null, eMod: null });
  const [quoteWcPremium, setQuoteWcPremium] = useState<string | null>(null);
  // Marker popup: which location detail panel is open + where to anchor it.
  const [markerPopup, setMarkerPopup] = useState<{ marker: GeoMarker; info: MarkerClickInfo } | null>(null);
  // Stage-span time filter — phase range selected on the milestone tracker
  // (click a node, or drag across nodes). Acts as a global time filter for
  // the dialog: activity, RFIs, documents, and tasks are narrowed to the
  // period the deal spent in the selected phases.
  const [phaseSel, setPhaseSel] = useState<{ a: number; b: number } | null>(null);
  const phaseDragRef = useRef<number | null>(null);
  // Last node clicked while a selection is active — re-clicking it clears
  // the time frame (unlimited extend clicks otherwise).
  const phaseLastClickRef = useRef<number | null>(null);
  // Row containing the phase nodes; during a drag we hit-test the pointer's
  // x position against it (window-level pointermove) so the selection pulls
  // smoothly from node to node — much more responsive than per-node
  // pointerenter, and works on touch and between nodes.
  const phaseRowRef = useRef<HTMLDivElement | null>(null);
  // While dragging, the handle follows the actual pointer (x in row-content
  // coordinates); the span endpoint only snaps to a node once the pointer
  // gets close to that node's center — not from far away.
  const [phaseDragX, setPhaseDragX] = useState<number | null>(null);
  useEffect(() => {
    const PAD = 18; // row horizontal padding
    const SNAP = 0.35; // snap radius as a fraction of one cell width
    const move = (e: PointerEvent) => {
      const anchor = phaseDragRef.current;
      const row = phaseRowRef.current;
      if (anchor == null || !row) return;
      const r = row.getBoundingClientRect();
      const w = r.width - PAD * 2;
      if (w <= 0) return;
      const cw = w / PHASES.length; // nodes are flex:1 equal-width cells
      const x = Math.max(0, Math.min(w, e.clientX - r.left - PAD));
      setPhaseDragX(x);
      const nearest = Math.max(0, Math.min(PHASES.length - 1, Math.floor(x / cw)));
      const center = (nearest + 0.5) * cw;
      // Only commit the endpoint when the pointer is near the node's center.
      if (Math.abs(x - center) <= cw * SNAP) {
        setPhaseSel((prev) => (prev && prev.a === anchor && prev.b === nearest ? prev : { a: anchor, b: nearest }));
      }
    };
    const up = () => { phaseDragRef.current = null; setPhaseDragX(null); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);
  // Backing quote for the header map (id + raw workforce profile) so popup
  // edits can be persisted via PATCH /quotes/:id.
  const [quoteRef, setQuoteRef] = useState<{ id: string; profile: WorkforceProfileRaw } | null>(null);
  // WFS pricing from the deal's quote (monthly fee + PEPM) and the state of
  // the one-click "Get Quote Now" generator on the right rail.
  const [wfsPricing, setWfsPricing] = useState<{ monthly: string | null; pepm: string | null }>({ monthly: null, pepm: null });
  const [wfsBusy, setWfsBusy] = useState(false);
  const [wfsError, setWfsError] = useState<string | null>(null);
  // Current rating levers on the quote (initial values for the rail's inline
  // WC "Modify" editor). Hydrated from GET /quotes/by-deal.
  const [quoteLevers, setQuoteLevers] = useState<VariationLevers | null>(null);

  const isInternal = !!user && INTERNAL.has(user.role);
  const canPost = !!user && (isInternal || user.role === "EMPLOYER");

  // Monotonic load sequence: bumped whenever the target deal changes so
  // slower responses from a previous deal can't overwrite the current one
  // (e.g. rapid deal switching or back/forward through ?deal= history).
  const loadSeqRef = useRef(0);
  const [loadError, setLoadError] = useState(false);

  const fetchSubmission = useCallback(async () => {
    const seq = loadSeqRef.current;
    try {
      const res = await api.get<SubmissionPayload>(`/deal-card/${dealId}/submission`);
      if (seq !== loadSeqRef.current) return;
      setPayload(res);
      setLoadError(false);
    } catch {
      if (seq !== loadSeqRef.current) return;
      setPayload(null);
      setLoadError(true);
    }
  }, [dealId]);

  const fetchActivity = useCallback(async () => {
    const seq = loadSeqRef.current;
    try {
      const res = await api.get<{ activity: ActivityRow[] }>(`/deal-card/${dealId}/activity`);
      if (seq !== loadSeqRef.current) return;
      setActivity(res.activity || []);
    } catch {
      if (seq !== loadSeqRef.current) return;
      setActivity([]);
    }
  }, [dealId]);

  const fetchRfis = useCallback(async () => {
    const seq = loadSeqRef.current;
    try {
      const res = await api.get<RfiListResponse>(`/deal-card/${dealId}/rfis`);
      if (seq !== loadSeqRef.current) return;
      setRfis(res.rfis || []);
      setOpenBlocking(res.openBlocking || 0);
    } catch {
      if (seq !== loadSeqRef.current) return;
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
    loadSeqRef.current += 1;
    setLoadError(false);
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
    setSavingSection(null);
    phaseLastClickRef.current = null;
    setPhaseSel(null);
    setMapMarkers([]);
    setQuoteStats({ locations: null, eMod: null });
    setQuoteWcPremium(null); // primary reset — never show prior deal's premium bubble while loading
    setQuoteDetail(null); // don't reopen a prior deal's KPI detail view (would hide the pricing row)
    setSubmissionFocus(null); // don't replay a prior deal's KPI jump on the new deal's Submission tab
    setMarkerPopup(null);
    fetchSubmission();
    fetchActivity();
    fetchRfis();
  }, [isOpen, dealId, fetchSubmission, fetchActivity, fetchRfis]);

  const sections = payload?.sections ?? [];
  const deal = payload?.deal;

  // One-click WFS quote: derive payroll + headcount from data already on the
  // deal (quote workforce profile first, deal-level columns as fallback) and
  // run the WFS rating engine, persisting the result onto the deal's quote.
  const deriveWfsInputs = useCallback((): { annualPayroll: number; headcount: number } => {
    let annualPayroll = 0;
    let headcount = 0;
    const wpl = quoteRef?.profile?.locations;
    if (Array.isArray(wpl) && wpl.length > 0) {
      for (const l of wpl) {
        for (const cc of l.classCodes ?? []) {
          annualPayroll += Number(cc.annualPayroll) || 0;
          headcount += (Number(cc.fullTimeEmployees) || 0) + (Number(cc.partTimeEmployees) || 0);
        }
      }
    }
    if (annualPayroll <= 0) annualPayroll = Number(deal?.annualPayroll) || 0;
    if (headcount <= 0) headcount = Number(deal?.employeeCountFt) || 0;
    return { annualPayroll, headcount };
  }, [quoteRef, deal]);

  const handleGetWfsQuote = useCallback(async (overrides?: { annualPayroll: number; headcount: number }): Promise<boolean> => {
    if (wfsBusy) return false;
    const seq = loadSeqRef.current; // discard the response if the deal changes mid-flight
    setWfsBusy(true);
    setWfsError(null);
    try {
      let { annualPayroll, headcount } = overrides ?? deriveWfsInputs();
      if (annualPayroll <= 0 || headcount <= 0) {
        setWfsError("Missing payroll or headcount on this deal — complete the workforce profile first.");
        return false;
      }
      const res = await api.post<{ success: boolean; data?: { result?: { monthlyWFSFee?: number; pepm?: number } }; error?: string }>(
        "/rate/wfs",
        { annualPayroll, headcount, dealId },
      );
      if (seq !== loadSeqRef.current) return false; // deal changed — drop stale result
      const r = res?.data?.result;
      if (!res?.success || !r) {
        setWfsError(res?.error || "Rating failed. Try again.");
        return false;
      }
      setWfsPricing({
        monthly: r.monthlyWFSFee != null ? String(r.monthlyWFSFee) : null,
        pepm: r.pepm != null ? String(r.pepm) : null,
      });
      return true;
    } catch (e) {
      if (seq === loadSeqRef.current) setWfsError(e instanceof Error ? e.message : "Rating failed. Try again.");
      return false;
    } finally {
      if (seq === loadSeqRef.current) setWfsBusy(false);
    }
  }, [wfsBusy, deriveWfsInputs, dealId]);

  // "Submit for Proposal" from the Submission tab: find (or create) the
  // deal's proposal, then request the approved proposal — the server rejects
  // the request unless every submission section is complete.
  const handleRequestProposal = useCallback(async (): Promise<boolean> => {
    const seq = loadSeqRef.current;
    const markRequested = async (status: string) => {
      if (seq !== loadSeqRef.current) return; // deal changed — skip state writes
      setPayload((p) => (p ? { ...p, deal: { ...p.deal, proposalStatus: status } } : p));
      await fetchActivity();
      onDealUpdated?.();
    };
    // Existing proposal for the deal, if any. If underwriting was already
    // requested (e.g. an earlier attempt whose response was lost), just
    // reconcile local state instead of re-posting.
    const existing = await api.get<{ proposal: { id: string; status: string } | null }>(`/proposals/${dealId}`);
    if (existing?.proposal && (existing.proposal.status === "approved_proposal_requested" || existing.proposal.status === "underwriting_notified")) {
      await markRequested(existing.proposal.status);
      return true;
    }
    let proposalId = existing?.proposal?.id ?? null;
    if (!proposalId) {
      // Prefer creating from the deal's quote (carries pricing); fall back to
      // a bare draft ONLY when the deal genuinely has no quote yet.
      try {
        const created = await api.post<{ success: boolean; proposal?: { id: string } }>(`/proposals/${dealId}/create-from-quote`, {});
        proposalId = created?.proposal?.id ?? null;
      } catch (e) {
        if (!(e instanceof Error && /no quote/i.test(e.message))) throw e;
        const created = await api.post<{ success: boolean; proposal?: { id: string } }>(`/proposals`, { deal_id: dealId });
        proposalId = created?.proposal?.id ?? null;
      }
    }
    if (!proposalId) return false;
    await api.post<{ success: boolean }>(`/proposals/${proposalId}/request-approved-proposal`, {});
    await markRequested("approved_proposal_requested");
    return true;
  }, [dealId, fetchActivity, onDealUpdated]);

  // Inline WC "Modify" editor on the rail — preview re-rates without
  // persisting; apply promotes the levers onto the quote (both internal-staff
  // only, enforced server-side).
  const handlePreviewWc = useCallback(
    async (levers: VariationLevers): Promise<{ premium: number; delta: number; deltaPct: number } | null> => {
      try {
        const res = await api.post<PreviewVariationResponse>(`/deal-card/${dealId}/quote-variations/preview`, levers);
        return { premium: res.premium, delta: res.delta, deltaPct: res.deltaPct };
      } catch {
        return null;
      }
    },
    [dealId],
  );

  const handleApplyWc = useCallback(
    async (levers: VariationLevers): Promise<boolean> => {
      const seq = loadSeqRef.current;
      try {
        const res = await api.post<ApplyVariationResponse>(`/deal-card/${dealId}/quote-variations/apply`, { ...levers, label: "Rail adjustment" });
        if (!res.success) return false;
        if (seq !== loadSeqRef.current) return false; // deal changed mid-flight
        setQuoteWcPremium(String(res.premium));
        setQuoteLevers(res.levers);
        // deals.wcPremium (when set) takes display precedence — keep it in sync.
        setPayload((p) => (p && p.deal.wcPremium ? { ...p, deal: { ...p.deal, wcPremium: String(res.premium) } } : p));
        await fetchActivity();
        onDealUpdated?.();
        return true;
      } catch {
        return false;
      }
    },
    [dealId, fetchActivity, onDealUpdated],
  );

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
        locationIndex?: number;
      };
      let locs: RawLoc[] = [];
      let stats: { locations: number | null; eMod: number | null } = { locations: null, eMod: null };
      let qref: { id: string; profile: WorkforceProfileRaw } | null = null;
      // Reset WFS rail state so a previously-opened deal's pricing/error never
      // bleeds into this deal while (or after) the quote hydrates.
      setWfsPricing({ monthly: null, pepm: null });
      setWfsError(null);
      setWfsBusy(false);
      setQuoteWcPremium(null);
      setQuoteLevers(null);
      try {
        const q = await api.get<{ id: string; workforceProfile?: WorkforceProfileRaw; monthlyWfsFee?: string | null; pepm?: string | null; wcPremium?: string | null; eMod?: string | null; scheduleRating?: string | null; isPeo?: boolean | null }>(`/quotes/by-deal/${dealId}`);
        if (active) {
          // Multi-location quotes store levers inside workforceProfile, not the
          // top-level columns — prefer the profile values when present.
          const wpLevers = q?.workforceProfile as { eMod?: number; scheduleRating?: number; isPEO?: boolean } | undefined;
          const em = typeof wpLevers?.eMod === "number" && wpLevers.eMod > 0
            ? wpLevers.eMod
            : q?.eMod != null ? parseFloat(String(q.eMod)) : NaN;
          const sr = typeof wpLevers?.scheduleRating === "number" && wpLevers.scheduleRating > 0
            ? wpLevers.scheduleRating
            : q?.scheduleRating != null ? parseFloat(String(q.scheduleRating)) : NaN;
          setQuoteLevers({
            eMod: !isNaN(em) && em > 0 ? em : 1.0,
            scheduleRating: !isNaN(sr) && sr > 0 ? sr : 1.0,
            isPEO: typeof wpLevers?.isPEO === "boolean" ? wpLevers.isPEO : !!q?.isPeo,
          });
          setWfsPricing({
            monthly: q?.monthlyWfsFee && parseFloat(q.monthlyWfsFee) > 0 ? q.monthlyWfsFee : null,
            pepm: q?.pepm && parseFloat(q.pepm) > 0 ? q.pepm : null,
          });
          // Deals priced through the quote flow carry the premium on the quote
          // row, not deals.wcPremium — keep it as the header-bubble fallback.
          setQuoteWcPremium(q?.wcPremium && parseFloat(q.wcPremium) > 0 ? q.wcPremium : null);
        }
        const wp = q?.workforceProfile;
        const wpl = wp?.locations;
        if (Array.isArray(wpl) && wpl.length > 0) {
          qref = { id: q.id, profile: wp as WorkforceProfileRaw };
          locs = wpl.map((l, idx) => ({
            state: l.state,
            zip: l.zip,
            locationIndex: idx,
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
        if (active) setWfsPricing({ monthly: null, pepm: null });
      }
      if (active) {
        setQuoteStats(stats);
        setQuoteRef(qref);
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
        const l = locs[i];
        if (pt) resolved.push({
          lng: pt[0], lat: pt[1], employees: l.employees,
          label: [l.state, l.zip].filter(Boolean).join(" ") || undefined,
          classCodes: l.classCodes,
          locationIndex: l.locationIndex,
        });
      });
      if (active) setMapMarkers(spreadDuplicates(resolved));
    })();
    return () => { active = false; };
  }, [isOpen, dealId, deal, quoteVersion]);

  // Persist an edited/expanded class-code list for one location back onto the
  // quote's workforce profile, then refresh the local marker + popup state so
  // the map chip, KPIs, and popup all reflect the new head-counts immediately.
  const saveLocationClassCodes = useCallback(
    async (locationIndex: number, next: GeoMarkerClassCode[]) => {
      if (!quoteRef) throw new Error("No quote to update");
      const profile: WorkforceProfileRaw = { ...quoteRef.profile };
      const locations = [...(profile.locations ?? [])];
      const loc = { ...(locations[locationIndex] ?? {}) };
      const prevRaw = loc.classCodes ?? [];
      // Merge by index: existing raw entries keep their extra keys; new rows
      // (beyond the previous length) become fresh raw objects.
      loc.classCodes = next.map((cc, i) => {
        const base = i < prevRaw.length ? { ...prevRaw[i] } : {};
        return {
          ...base,
          classCode: cc.code || base.classCode,
          description: cc.description ?? base.description,
          annualPayroll: cc.payroll ?? base.annualPayroll,
          fullTimeEmployees: cc.ft,
          partTimeEmployees: cc.pt,
        };
      });
      locations[locationIndex] = loc;
      profile.locations = locations;
      await api.patch(`/quotes/${quoteRef.id}`, { workforceProfile: profile });
      setQuoteRef({ id: quoteRef.id, profile });
      const employees = next.reduce((s, cc) => s + cc.ft + cc.pt, 0);
      setMapMarkers((prev) =>
        prev.map((m) => (m.locationIndex === locationIndex ? { ...m, employees, classCodes: next } : m)),
      );
      setMarkerPopup((prev) =>
        prev && prev.marker.locationIndex === locationIndex
          ? { ...prev, marker: { ...prev.marker, employees, classCodes: next } }
          : prev,
      );
    },
    [quoteRef],
  );

  // Global time window derived from the selected phase span. Reconstructs the
  // deal's phase timeline from stage-move activity events — STAGE_CHANGE plus
  // deal_approved / deal_declined, which also carry from_stage/to_stage — and
  // keeps a TRUE multi-interval union of the segments spent in the selected
  // phases (a deal can leave the span and re-enter; the gap must not count).
  // An interval with `to === undefined` is still open (deal currently in
  // span); `empty` means the deal never visited the selected phases.
  // `from`/`to` are the envelope, used only for the pill label.
  const STAGE_MOVE_EVENTS = ["STAGE_CHANGE", "deal_approved", "deal_declined"];
  const timeWindow = useMemo(() => {
    if (!phaseSel) return null;
    const lo = Math.min(phaseSel.a, phaseSel.b);
    const hi = Math.max(phaseSel.a, phaseSel.b);
    const changes = activity
      .filter((a) => STAGE_MOVE_EVENTS.includes(a.eventType || "") && a.createdAt && a.metadata?.to_stage)
      .map((a) => ({
        t: new Date(String(a.createdAt)).getTime(),
        from: phaseIndex(a.metadata?.from_stage as string | undefined),
        to: phaseIndex(a.metadata?.to_stage as string | undefined),
      }))
      .filter((x) => !isNaN(x.t))
      .sort((x, y) => x.t - y.t);
    const dealCreated = payload?.deal?.createdAt ? new Date(String(payload.deal.createdAt)).getTime() : undefined;
    const segs: Array<{ phase: number; start?: number; end?: number }> = [];
    let curStart = dealCreated;
    let curPhase = changes.length > 0 ? changes[0].from : phaseIndex(payload?.deal?.stage);
    for (const ch of changes) {
      segs.push({ phase: curPhase, start: curStart, end: ch.t });
      curStart = ch.t;
      curPhase = ch.to;
    }
    segs.push({ phase: curPhase, start: curStart, end: undefined });
    // Merge adjacent/contiguous in-span segments into intervals (segments are
    // already in chronological order; consecutive in-span segments share a
    // boundary timestamp, so they merge into one interval).
    const intervals: Array<{ from?: number; to?: number }> = [];
    for (const s of segs) {
      if (s.phase < lo || s.phase > hi) continue;
      const last = intervals[intervals.length - 1];
      if (last && last.to != null && s.start != null && s.start <= last.to) {
        last.to = s.end;
      } else {
        intervals.push({ from: s.start, to: s.end });
      }
    }
    if (intervals.length === 0) return { lo, hi, from: undefined as number | undefined, to: undefined as number | undefined, intervals, empty: true };
    const from = intervals[0].from;
    const ends = intervals.map((iv) => iv.to);
    const to = ends.some((e) => e == null) ? undefined : Math.max(...(ends as number[]));
    return { lo, hi, from, to, intervals, empty: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseSel, activity, payload?.deal]);

  const inWindow = useCallback((iso?: string | null) => {
    if (!timeWindow) return true;
    if (timeWindow.empty) return false;
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (isNaN(t)) return false;
    return timeWindow.intervals.some((iv) => (iv.from == null || t >= iv.from) && (iv.to == null || t <= iv.to));
  }, [timeWindow]);

  const filteredActivity = useMemo(() => (timeWindow ? activity.filter((a) => inWindow(a.createdAt)) : activity), [timeWindow, activity, inWindow]);
  const filteredRfis = useMemo(() => (timeWindow ? rfis.filter((r) => inWindow(r.createdAt)) : rfis), [timeWindow, rfis, inWindow]);

  const handleSaveSection = async (sectionKey: string, fields: Record<string, unknown>): Promise<boolean> => {
    if (Object.keys(fields).length === 0) return true;
    const seq = loadSeqRef.current; // ignore this save's response if the deal changes mid-flight
    setSavingSection(sectionKey);
    try {
      const res = await api.patch<SectionPatchResponse>(`/deal-card/${dealId}/submission/${sectionKey}`, { fields });
      if (seq !== loadSeqRef.current) return false;
      if (res.sections) {
        setPayload((p) => (p ? { ...p, sections: res.sections!, aggregateComplete: res.aggregateComplete ?? p.aggregateComplete, total: res.total ?? p.total, deal: res.deal ?? p.deal } : p));
      } else {
        await fetchSubmission();
      }
      await fetchActivity();
      onDealUpdated?.();
      return true;
    } catch {
      /* validation errors surface as a no-op; keep the drafts so the user can retry */
      return false;
    } finally {
      setSavingSection((cur) => (cur === sectionKey ? null : cur));
    }
  };

  const handleSend = async (message: string, mentions?: string[]) => {
    setPosting(true);
    try {
      await api.post(`/deal-card/${dealId}/messages`, { message, mentions: mentions ?? [] });
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

  // Reopens the indication form (quote wizard) prefilled from the deal + its
  // saved workforce profile so the broker can edit, update, and complete it.
  // Lands on the first wizard step whose submission section is incomplete
  // (the spots required before requesting a proposal). Closes the dialog.
  // NOTE: must stay above the `if (!isOpen)` early return — it's a hook.
  const openIndicationForm = useCallback(() => {
    if (!deal) return;
    const wp = quoteRef?.profile;
    const locations = Array.isArray(wp?.locations)
      ? wp.locations.map((l, i) => ({
          id: `deal-loc-${i}`,
          streetAddress: "",
          city: "",
          state: l.state ?? "",
          zip: l.zip ?? "",
          classCodes: (l.classCodes ?? []).map((cc) => ({
            classCode: String(cc.classCode ?? ""),
            description: cc.description ?? "",
            fullTimeEmployees: Number(cc.fullTimeEmployees) || 0,
            partTimeEmployees: Number(cc.partTimeEmployees) || 0,
            annualPayroll: Number(cc.annualPayroll) || 0,
          })),
        }))
      : [];
    const eModNum = typeof wp?.eMod === "number" && wp.eMod > 0
      ? wp.eMod
      : deal.emod != null && parseFloat(String(deal.emod)) > 0
        ? parseFloat(String(deal.emod))
        : NaN;
    const prefill: Record<string, unknown> = {
      businessName: deal.businessName || "",
      businessState: deal.state || "",
      fein: typeof deal.fein === "string" ? deal.fein : "",
      entityType: typeof deal.entityType === "string" ? deal.entityType : "",
      yearsInBusiness: deal.yearsInBusiness != null ? String(deal.yearsInBusiness) : "",
      statesOfOperation: Array.isArray(deal.statesOfOperation) ? deal.statesOfOperation : [],
      coverageEffectiveDate: deal.coverageEffectiveDate || "",
      ...(locations.length > 0 ? { locations, locationCount: String(locations.length) } : {}),
      ...(!isNaN(eModNum) ? { hasExperienceMod: "Yes", experienceMod: String(eModNum) } : {}),
    };
    // Land on the phase-2 transition screen ("Great — let's build your full
    // submission") so the broker steps through the remaining details needed
    // before the proposal goes to underwriting.
    prefill.phase = 2;
    prefill.currentStep = 0;
    onClose();
    navigate("/marketplace/quote/wizard", {
      state: {
        vertical: deal.vertical || "Cannabis",
        coverageType: deal.productType || "WC",
        prefill,
      },
    });
  }, [deal, quoteRef, payload, onClose, navigate]);

  if (!isOpen) return null;

  const stage = deal?.stage;
  const currentPhase = phaseIndex(stage);
  // A Lost-stage deal shows a red "Declined" marker at its mapped phase node.
  const declined = stage === "LOST";
  const effectiveDate = deal?.coverageEffectiveDate ? new Date(String(deal.coverageEffectiveDate)).toLocaleDateString() : null;

  const badges = [deal?.vertical, deal?.productType].filter(Boolean) as string[];

  // Deal-level columns first, then quote workforce-profile fallbacks (deals
  // created via the quote flow often never backfill numberOfLocations / emod).
  const locationsVal = fieldValue(sections, "locations", "numberOfLocations") ?? quoteStats.locations ?? (mapMarkers.length > 0 ? mapMarkers.length : null);
  const exModRaw = fieldValue(sections, "workforce", "emod") ?? quoteStats.eMod;
  const exModVal = exModRaw == null || exModRaw === "" || isNaN(Number(exModRaw)) ? null : Number(exModRaw).toFixed(2);

  // EXMOD takes the Hazometer rating color; the other three take the accent gradient.
  const exModNum = exModVal == null ? null : Number(exModVal);
  const kpis = [
    { label: "LOCATIONS", metric: "locations" as IndicationMetric, Icon: MapPin, value: fmtNum(locationsVal), exModColor: null as string | null, section: "locations", field: "numberOfLocations" },
    { label: "EMPLOYEES", metric: "employees" as IndicationMetric, Icon: Users, value: fmtNum(fieldValue(sections, "workforce", "employeeCountFt")), exModColor: null as string | null, section: "workforce", field: "employeeCountFt" },
    { label: "PAYROLL", metric: "payroll" as IndicationMetric, Icon: Banknote, value: fmtMoneyShort(fieldValue(sections, "workforce", "annualPayroll")), exModColor: null as string | null, section: "workforce", field: "annualPayroll" },
    { label: "EXMOD", metric: "exmod" as IndicationMetric, Icon: Gauge, value: exModVal ?? "\u2014", exModColor: exModNum == null ? null : exModColor(exModNum), section: "workforce", field: "emod" },
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
          // Fixed height (not maxHeight) so the dialog never resizes/jumps as
          // tab or filtered content changes; body panes scroll internally.
          width: "100%", maxWidth: "min(94vw, 1440px)", height: "96vh", display: "flex", flexDirection: "column",
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
              onMarkerClick={(marker, info) =>
                setMarkerPopup((prev) =>
                  prev && prev.marker.locationIndex !== undefined && prev.marker.locationIndex === marker.locationIndex
                    ? null
                    : prev && prev.marker === marker
                      ? null
                      : { marker, info },
                )
              }
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
            {/* identity block itself is click-transparent (its box can cover a
                map marker); only the avatar row re-enables pointer events. */}
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Star style={{ width: 18, height: 18, color: c.textMuted, flexShrink: 0 }} />
                <div style={{ fontSize: 18, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deal?.businessName || "Deal"}</div>
                <div style={{ pointerEvents: "auto", flexShrink: 0 }}>
                  <DealTeamAvatars team={payload?.team} directory={payload?.directory} />
                </div>
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
            </div>
            {/* KPI cluster — large glowing numbers with identifying icons, left of the X.
                Wraps under the identity block on narrow widths instead of colliding. */}
            {/* KPI numbers are display-only — keep the cluster click-transparent
                so markers underneath stay clickable; only the X re-enables. */}
            {/* Sizes scale with viewport (clamp) so all four KPIs stay on one
                row even at mobile widths instead of wrapping/jumbling. */}
            <div style={{ display: "flex", flexWrap: "nowrap", alignItems: "flex-start", justifyContent: "flex-end", columnGap: "clamp(8px, 2.4vw, 26px)", rowGap: 10, flex: "0 1 auto", minWidth: 0 }}>
              {kpis.map(({ label, Icon, value, exModColor: exColor, section: kpiSection, field: kpiField }) => {
                const isDash = value === "\u2014";
                const numberStyle: CSSProperties = {
                  fontSize: "clamp(14px, 3.2vw, 26px)", fontWeight: 600, lineHeight: 1.15, marginTop: 3, fontVariantNumeric: "tabular-nums",
                  ...(isDash || label === "EXMOD"
                    ? // EXMOD stays neutral like the other header text — health is
                      // conveyed by the status dot beside it, never by tinted numerals.
                      { color: hdrValue, textShadow: hdrValueGlow }
                    : {
                        // Flat primary accent number (LOCATIONS / EMPLOYEES / PAYROLL).
                        color: "var(--accent-primary)",
                      }),
                };
                const showDot = label === "EXMOD" && !isDash && exColor;
                return (
                  // KPI jumps to the matching field on the Submission tab
                  // (from any tab) — re-enables pointer events on the
                  // otherwise click-transparent cluster.
                  <div
                    key={label}
                    role="button"
                    tabIndex={0}
                    title={`Review & edit ${label.toLowerCase()}`}
                    onClick={() => { setSubmissionFocus({ section: kpiSection, field: kpiField, token: Date.now() }); setTab("submission"); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSubmissionFocus({ section: kpiSection, field: kpiField, token: Date.now() }); setTab("submission"); } }}
                    style={{ textAlign: "right", pointerEvents: "auto", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, fontSize: "clamp(8px, 1.3vw, 10px)", letterSpacing: "0.08em", fontWeight: 600, color: hdrSoftGrey, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      <Icon style={{ width: "clamp(9px, 1.7vw, 13px)", height: "clamp(9px, 1.7vw, 13px)", color: hdrSoftGrey }} />
                      {label}
                    </div>
                    {showDot ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                        <div style={numberStyle} data-testid="text-exmod-value">{value}</div>
                        <span
                          data-testid="dot-exmod-health"
                          style={{
                            width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                            background: exColor as string,
                            boxShadow: `0 0 8px ${exColor}55`,
                          }}
                        />
                      </div>
                    ) : (
                      <div style={numberStyle}>{value}</div>
                    )}
                  </div>
                );
              })}
              <X onClick={onClose} style={{ width: 18, height: 18, color: c.textMuted, cursor: "pointer", flexShrink: 0, marginTop: 1, pointerEvents: "auto" }} />
            </div>
          </div>

          {/* 6-phase macro tracker — map continues behind it. Also a slide bar:
              1st click selects a stage, 2nd click on another node draws the
              span between them, 3rd click reverts to the full timeline. The
              selection is a global time filter for the dialog (activity, RFIs,
              documents, tasks). The pill slot has a fixed height so the dialog
              never resizes. pointerEvents: none on the row lets map clicks
              through; each node re-enables them. */}
          <div style={{ position: "relative", zIndex: 1, marginTop: "auto", pointerEvents: "none" }}>
            {/* Fixed-height slot so showing/hiding the pill never changes the
                dialog size (no jump on screen). */}
            <div style={{ display: "flex", justifyContent: "center", padding: "0 18px", height: 26, alignItems: "center" }}>
              {timeWindow && (
                <div
                  data-testid="pill-phase-filter"
                  style={{
                    pointerEvents: "auto", display: "flex", alignItems: "center", gap: 8,
                    padding: "4px 6px 4px 12px", borderRadius: 9999,
                    background: c.accentPrimarySoft, border: "1px solid rgba(233,30,140,0.45)",
                  }}
                >
                  <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--accent-primary)" }}>
                    {timeWindow.lo === timeWindow.hi ? PHASES[timeWindow.lo] : `${PHASES[timeWindow.lo]} → ${PHASES[timeWindow.hi]}`}
                  </span>
                  <span style={{ fontSize: 10.5, color: hdrValue, fontWeight: 500 }}>
                    {timeWindow.empty
                      ? "not reached yet"
                      : `${timeWindow.from != null ? new Date(timeWindow.from).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "start"} – ${timeWindow.to != null ? new Date(timeWindow.to).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "now"}`}
                  </span>
                  <button
                    type="button"
                    data-testid="button-clear-phase-filter"
                    title="Clear time filter"
                    aria-label="Clear time filter"
                    onClick={() => { phaseLastClickRef.current = null; setPhaseSel(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}
                  >
                    <X style={{ width: 12, height: 12, color: "var(--accent-primary)" }} />
                  </button>
                </div>
              )}
            </div>
            <div ref={phaseRowRef} style={{ position: "relative", display: "flex", alignItems: "flex-start", padding: "10px 18px 12px" }}>
              {/* Live drag feedback: a pink handle rides at the exact pointer
                  position with a pull-line back to the anchor node; the span
                  itself only snaps when the handle nears a node. */}
              {phaseDragX != null && phaseSel && phaseRowRef.current && (() => {
                const w = phaseRowRef.current.getBoundingClientRect().width - 36;
                if (w <= 0) return null;
                const cw = w / PHASES.length;
                const ax = 18 + (phaseSel.a + 0.5) * cw; // anchor node center
                const px = 18 + phaseDragX; // pointer position
                return (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }} data-testid="drag-phase-overlay">
                    <div style={{ position: "absolute", top: 15, left: Math.min(ax, px), width: Math.abs(px - ax), height: 2, background: "var(--accent-primary)", opacity: 0.8 }} />
                    <div style={{ position: "absolute", top: 9, left: px - 7, width: 14, height: 14, borderRadius: "50%", background: "var(--accent-primary)", boxShadow: "0 0 12px rgba(233,30,140,0.8)", border: "2px solid rgba(255,255,255,0.85)" }} />
                  </div>
                );
              })()}
              {PHASES.map((label, i) => {
                const done = i < currentPhase;
                const current = i === currentPhase;
                const declinedNode = current && declined;
                const selected = timeWindow != null && i >= timeWindow.lo && i <= timeWindow.hi;
                const nodeColor = selected ? "var(--accent-primary)" : declinedNode ? "#ef4444" : current ? hdrGlowNode : done ? hdrSoftGrey : hdrFaint;
                const lblColor = selected ? "var(--accent-primary)" : declinedNode ? "#ef4444" : current ? hdrValue : done ? hdrSoftGrey : c.textMuted;
                const connSelected = timeWindow != null && i > timeWindow.lo && i <= timeWindow.hi;
                return (
                  <div
                    key={label}
                    role="button"
                    tabIndex={0}
                    aria-label={`Filter to ${label}${selected ? " (selected)" : ""}`}
                    data-testid={`node-phase-${i}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      // release implicit capture (touch) so the window-level
                      // pointermove drag hit-testing keeps receiving events
                      (e.target as Element).releasePointerCapture?.(e.pointerId);
                      // Click semantics: every click on a new node extends the
                      // span to include it (unlimited clicks); re-clicking the
                      // node you just clicked reverts to the full timeline.
                      if (phaseSel) {
                        if (phaseLastClickRef.current === i) {
                          // re-click of the node just clicked → clear
                          phaseLastClickRef.current = null;
                          setPhaseSel(null);
                          return;
                        }
                        const lo = Math.min(phaseSel.a, phaseSel.b);
                        const hi = Math.max(phaseSel.a, phaseSel.b);
                        const nlo = Math.min(lo, i);
                        const nhi = Math.max(hi, i);
                        // keep dragging from the endpoint farther from the
                        // click so the near side can still be adjusted live
                        phaseDragRef.current = i - nlo >= nhi - i ? nlo : nhi;
                        phaseLastClickRef.current = i;
                        setPhaseSel({ a: nlo, b: nhi });
                        return;
                      }
                      phaseDragRef.current = i;
                      phaseLastClickRef.current = i;
                      setPhaseSel({ a: i, b: i });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPhaseSel((prev) => {
                          if (prev) {
                            if (phaseLastClickRef.current === i) {
                              phaseLastClickRef.current = null;
                              return null;
                            }
                            phaseLastClickRef.current = i;
                            return { a: Math.min(prev.a, prev.b, i), b: Math.max(prev.a, prev.b, i) };
                          }
                          phaseLastClickRef.current = i;
                          return { a: i, b: i };
                        });
                      }
                    }}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", minWidth: 0, pointerEvents: "auto", cursor: "pointer", touchAction: "none", paddingTop: 8, marginTop: -8 }}
                    title={
                      timeWindow
                        ? "Click another stage to extend the time frame; re-click the last stage to show the full timeline"
                        : "Click to filter the deal to this stage"
                    }
                  >
                    {i > 0 && <div style={{ position: "absolute", top: 13, left: "-50%", width: "100%", height: 2, background: connSelected ? "var(--accent-primary)" : i <= currentPhase ? hdrSoftGrey : hdrFaint, opacity: connSelected ? 0.7 : 1 }} />}
                    <span
                      style={{
                        width: 12, height: 12, borderRadius: "50%", border: `2px solid ${nodeColor}`,
                        background: selected ? "var(--accent-primary)" : done ? hdrSoftGrey : "transparent",
                        position: "relative", zIndex: 1,
                        boxShadow: selected ? "0 0 10px rgba(233,30,140,0.6)" : current ? hdrNodeGlow : "none",
                      }}
                    />
                    <span style={{ fontSize: 10, marginTop: 8, color: lblColor, textAlign: "center", lineHeight: 1.3, maxWidth: 92, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500, textShadow: current && !selected ? hdrValueGlow : "none" }}>
                      {declinedNode ? "Declined" : label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location detail popup — portaled to <body> so it renders on top of
              everything (modal, header bands, milestone tracker), unclipped. */}
          {markerPopup && (
            <LocationPopup
              marker={markerPopup.marker}
              anchor={{ clientX: markerPopup.info.clientX, clientY: markerPopup.info.clientY }}
              editable={!!quoteRef && markerPopup.marker.locationIndex !== undefined}
              onClose={() => setMarkerPopup(null)}
              onSave={(next) => saveLocationClassCodes(markerPopup.marker.locationIndex ?? -1, next)}
            />
          )}
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
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, padding: 14, overflow: "auto" }}>
            {!payload ? (
              loadError ? (
                <div style={{ padding: "40px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Deal unavailable</div>
                  <div style={{ fontSize: 12.5, color: c.textMuted, maxWidth: 360 }}>
                    This deal could not be loaded — it may not exist or you may not have access to it.
                  </div>
                  <GhostButton onClick={onClose} data-testid="button-close-unavailable-deal" style={{ padding: "6px 14px", fontSize: 12.5 }}>
                    Close
                  </GhostButton>
                </div>
              ) : (
                <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: c.textMuted }}>Loading deal\u2026</div>
              )
            ) : (
              <>
                {tab === "submission" && <ReRateBanner show={!!deal?.ratingStale} onReRate={handleReRate} />}
                {tab === "overview" && (
                  <OverviewTab
                    activity={filteredActivity}
                    canPost={canPost}
                    posting={posting}
                    onSend={handleSend}
                    directory={payload?.directory ?? []}
                    rfis={filteredRfis}
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
                {tab === "submission" && <SubmissionTab key={dealId} sections={sections} aggregateComplete={payload.aggregateComplete} total={payload.total} access={payload.access} savingSection={savingSection} onSaveSection={handleSaveSection} canRequestProposal={isInternal} proposalStatus={(deal?.proposalStatus as string | null) ?? null} onRequestProposal={handleRequestProposal} focusRequest={submissionFocus} />}
                {tab === "subjectivities" && <SubjectivitiesTab dealId={dealId} />}
                {tab === "documents" && <DocumentsTab dealId={dealId} timeWindow={timeWindow} />}
                {tab === "tasks" && (
                  <TasksTab dealId={dealId} timeWindow={timeWindow} />
                )}
                {tab === "quote" && (
                  <QuoteTab
                    dealId={dealId}
                    businessName={deal?.businessName || ""}
                    productType={deal?.productType}
                    vertical={deal?.vertical}
                    coverageEffectiveDate={deal?.coverageEffectiveDate ? String(deal.coverageEffectiveDate) : null}
                    detailMetric={quoteDetail}
                    onCloseDetail={() => setQuoteDetail(null)}
                    canEditParams={isInternal}
                    onQuoteUpdated={() => { setQuoteVersion((v) => v + 1); fetchActivity(); fetchSubmission(); }}
                    onClose={onClose}
                  />
                )}
                {tab === "policy" && <PolicyTab dealId={dealId} bindStatus={deal?.bindStatus} />}
              </>
            )}
          </div>
          </div>

          {/* Persistent pricing + decision rail — WC/WFS pricing and
              Approve/Decline visible on every tab. */}
          {payload && (
            <div style={{ width: 264, flexShrink: 0, borderLeft: `1px solid ${c.borderColor}`, padding: 12, overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
              <PricingRail
                key={dealId} /* reset inline editor state when the deal changes */
                wcPremium={((deal?.wcPremium as string) || quoteWcPremium) ?? null}
                wfsMonthly={wfsPricing.monthly}
                wfsPepm={wfsPricing.pepm ?? ((deal?.wfsPepmRate as string) || null)}
                wfsBusy={wfsBusy}
                wfsError={wfsError}
                onGetWfsQuote={isInternal ? () => void handleGetWfsQuote() : undefined}
                canApprove={payload.canApprove}
                busy={decisionBusy}
                openBlocking={openBlocking}
                approveError={approveError}
                onApprove={handleApprove}
                onDecline={handleDecline}
                canModifyWc={isInternal && !!(((deal?.wcPremium as string) || quoteWcPremium))}
                wcBaseLevers={quoteLevers}
                onPreviewWc={handlePreviewWc}
                onApplyWc={handleApplyWc}
                wfsDefaults={deriveWfsInputs()}
                onRequoteWfs={isInternal ? (annualPayroll, headcount) => handleGetWfsQuote({ annualPayroll, headcount }) : undefined}
              />
              {/* §6E deposit monitor — only present once a deal is bound. */}
              {!!(deal as { depositStatus?: string | null } | undefined)?.depositStatus && (
                <DepositCard
                  dealId={dealId}
                  depositStatus={(deal as { depositStatus?: string }).depositStatus!}
                  depositDueDate={((deal as { depositDueDate?: string | null }).depositDueDate ?? null)}
                  canAct={!!user && (user.role === "ADMIN" || user.role === "CSA")}
                  onChanged={() => { void fetchSubmission(); fetchActivity(); }}
                />
              )}
            </div>
          )}
        </div>
      </div>

    </div>,
    document.body,
  );
}

