import { useState, useEffect, useCallback, useMemo, useRef, type DragEvent, type ReactNode } from "react";
import {
  SectionHeader,
  GlassCard,
  PinkButton,
  GhostButton,
  Badge,
  Modal,
} from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";
import { api } from "@/lib/api";
import { openDealCard } from "@/components/DealCardModal";
import { useTeamMembers } from "@/lib/users";
import { VERTICAL_ICONS } from "@/lib/vertical-icons";
import { PIPELINE_STAGES } from "@workspace/pipeline";
import {
  Plus,
  Columns3,
  List,
} from "lucide-react";

interface Deal {
  id: string;
  referenceCode: string;
  businessName?: string;
  vertical?: string;
  productType?: string;
  state?: string;
  annualPayroll?: string;
  employeeCountFt?: number;
  stage?: string;
  outcome?: string;
  wcPremium?: string;
  wfsPepmRate?: string;
  ownerId?: string;
  createdAt?: string;
}

// The 10 canonical stages come from the shared @workspace/pipeline constant —
// the single source of truth. Lost is an outcome, not a column, so it is off-board.
const STAGES = PIPELINE_STAGES.map((s) => ({ num: s.order, key: s.key, label: s.label }));
const DEFAULT_STAGE = STAGES[0].key;

const VERTICALS = [
  "Cannabis",
  "Construction",
  "Staffing",
  "Healthcare",
  "Hospitality",
  "Transportation",
  "Manufacturing",
  "Retail",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const CARDS_PER_PAGE = 10;

interface LazyColumnBodyProps {
  children: ReactNode;
  hasMore: boolean;
  onLoadMore: () => void;
  isDropTarget: boolean;
  isDark: boolean;
}

function LazyColumnBody({ children, hasMore, onLoadMore, isDropTarget, isDark }: LazyColumnBodyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore) return;
    const scrollEl = scrollRef.current;
    const sentinelEl = sentinelRef.current;
    if (!scrollEl || !sentinelEl) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMoreRef.current();
      },
      { root: scrollEl, rootMargin: "200px 0px" }
    );
    obs.observe(sentinelEl);
    return () => obs.disconnect();
  }, [hasMore]);

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: "auto",
        minHeight: "200px",
        padding: "8px",
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${isDropTarget ? "rgba(233,30,140,0.4)" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: "12px",
        transition: "border-color 0.15s",
      }}
    >
      {children}
      {hasMore && <div ref={sentinelRef} style={{ height: "1px" }} />}
    </div>
  );
}

function formatCurrency(val: string | number | undefined | null): string {
  if (!val) return "$0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

function generateRefCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AX-${ts}-${rand}`;
}

export default function Pipeline() {
  const { theme } = useThemeStore();
  const { members } = useTeamMembers();
  const isDark = theme === "dark";
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [appetiteFilter, setAppetiteFilter] = useState<string>("");
  const [dealAppetiteMap, setDealAppetiteMap] = useState<Record<string, string>>({});
  const [showLost, setShowLost] = useState(false);
  const [bindConfirm, setBindConfirm] = useState<{ dealId: string; name: string; prevStage?: string } | null>(null);

  const [form, setForm] = useState({
    businessName: "",
    vertical: "",
    productType: "WC",
    state: "",
    annualPayroll: "",
    employeeCountFt: "",
    assignedTo: "",
  });

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [lostDeals, setLostDeals] = useState<Deal[]>([]);

  const fetchDeals = useCallback(async () => {
    try {
      // Default list already excludes outcome='lost' (server, Step D).
      const data = await api.get<Deal[]>("/deals");
      setDeals(data);
    } catch (err) {
      console.error("Failed to fetch deals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lost deals are absent from the active board; fetched on demand via
  // ?includeLost=true and filtered to outcome='lost' for the Lost view.
  const fetchLostDeals = useCallback(async () => {
    try {
      const data = await api.get<Deal[]>("/deals?includeLost=true");
      setLostDeals(data.filter((d) => d.outcome === "lost"));
    } catch (err) {
      console.error("Failed to fetch lost deals:", err);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    if (showLost) fetchLostDeals();
  }, [showLost, fetchLostDeals]);

  useEffect(() => {
    const handler = () => { fetchDeals(); };
    window.addEventListener("deal-updated", handler);
    return () => window.removeEventListener("deal-updated", handler);
  }, [fetchDeals]);

  useEffect(() => {
    const uniqueStates = [...new Set(deals.map((d) => d.state).filter(Boolean))] as string[];
    if (uniqueStates.length === 0) return;
    const lookups = uniqueStates.map((s) => ({ state: s, class_code: "0000" }));
    api.post<{ results: Array<{ state: string; class_code: string; uw_determination: string }> }>("/appetite/batch", { lookups })
      .then((res) => {
        const map: Record<string, string> = {};
        for (const r of res.results) {
          map[r.state] = r.uw_determination;
        }
        setDealAppetiteMap(map);
      })
      .catch(() => {});
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (!appetiteFilter) return deals;
    return deals.filter((d) => {
      if (!d.state) return false;
      const det = dealAppetiteMap[d.state];
      return det === appetiteFilter;
    });
  }, [deals, appetiteFilter, dealAppetiteMap]);

  const dealsByStage = (stageKey: string) =>
    filteredDeals.filter((d) => (d.stage || DEFAULT_STAGE) === stageKey);

  const [visibleByStage, setVisibleByStage] = useState<Record<string, number>>({});

  useEffect(() => {
    setVisibleByStage({});
  }, [filteredDeals]);

  const loadMoreForStage = useCallback((stageKey: string) => {
    setVisibleByStage((prev) => ({
      ...prev,
      [stageKey]: (prev[stageKey] ?? CARDS_PER_PAGE) + CARDS_PER_PAGE,
    }));
  }, []);

  const totalDeals = deals.length;
  const totalWcPremium = deals.reduce((sum, d) => {
    const v = d.wcPremium ? parseFloat(d.wcPremium) : 0;
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const handleCreateDeal = async () => {
    if (!form.businessName || !form.vertical || !form.state) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        referenceCode: generateRefCode(),
        businessName: form.businessName,
        vertical: form.vertical,
        productType: form.productType,
        state: form.state,
        annualPayroll: form.annualPayroll || undefined,
        employeeCountFt: form.employeeCountFt ? parseInt(form.employeeCountFt) : undefined,
        stage: DEFAULT_STAGE,
      };
      if (form.assignedTo) {
        payload.ownerId = form.assignedTo;
      }
      const newDeal = await api.post<Deal>("/deals", payload);
      const slug = form.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
      api.post(`/deals/${newDeal.id}/email`, {
        emailAddress: `${slug}@listener.axel.io`,
        companySlug: slug,
      }).catch(() => {});
      api.post(`/deals/${newDeal.id}/activity`, {
        entityType: "deal",
        entityId: newDeal.id,
        eventType: "DEAL_CREATED",
        description: `Deal created for ${form.businessName}`,
      }).catch(() => {});
      await fetchDeals();
      setShowNewDeal(false);
      setForm({
        businessName: "",
        vertical: "",
        productType: "WC",
        state: "",
        annualPayroll: "",
        employeeCountFt: "",
        assignedTo: "",
      });
    } catch (err) {
      console.error("Failed to create deal:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/plain", dealId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(dealId);
  };

  const handleDragOver = (e: DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageKey);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  // Move a deal to a stage optimistically and persist. The server (Step D) owns
  // the bind-readiness gate + implementation-tracker trigger — the board just
  // PATCHes the stage. On a 409 (not bind-ready) we snap the card back and
  // surface the server's reason.
  const commitStageMove = useCallback(async (dealId: string, stageKey: string, prevStage?: string) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: stageKey } : d)));
    try {
      await api.patch(`/deals/${dealId}`, { stage: stageKey });
    } catch (err) {
      // Snap back to the prior column (prevStage is captured at drop time, so
      // rollback is deterministic even under overlapping updates).
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: prevStage } : d)));
      const raw = err instanceof Error ? err.message : String(err);
      let reason = raw;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string") reason = parsed;
        else if (parsed && typeof parsed === "object") reason = JSON.stringify(parsed);
      } catch { /* not JSON — use raw */ }
      window.alert(reason);
      fetchDeals();
    }
  }, [fetchDeals]);

  const handleDrop = async (e: DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData("text/plain");
    if (!dealId) return;
    setDraggingId(null);

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === stageKey) return;

    // Entering Bound requires an explicit confirm before the server gate runs.
    if (stageKey === "BOUND") {
      setBindConfirm({ dealId, name: deal.businessName || "this deal", prevStage: deal.stage });
      return;
    }

    await commitStageMove(dealId, stageKey, deal.stage);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    color: textPrimary,
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: textMuted,
    marginBottom: "6px",
  };

  const focusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "var(--accent-primary)";
  };
  const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = inputBorder;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
        <SectionHeader
          title="Pipeline"
          subtitle={`${totalDeals} deals · ${formatCurrency(totalWcPremium)} WC Premium`}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
          <div
            style={{
              display: "flex",
              borderRadius: "8px",
              border: `1px solid ${borderSubtle}`,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setViewMode("kanban")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 14px",
                fontSize: "13px",
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                background: viewMode === "kanban" ? "rgba(233,30,140,0.15)" : "transparent",
                color: viewMode === "kanban" ? "var(--accent-primary)" : textMuted,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <Columns3 style={{ width: "14px", height: "14px" }} />
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 14px",
                fontSize: "13px",
                fontWeight: 500,
                border: "none",
                borderLeft: `1px solid ${borderSubtle}`,
                cursor: "pointer",
                background: viewMode === "list" ? "rgba(233,30,140,0.15)" : "transparent",
                color: viewMode === "list" ? "var(--accent-primary)" : textMuted,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <List style={{ width: "14px", height: "14px" }} />
              List
            </button>
          </div>
          <PinkButton
            onClick={() => setShowNewDeal(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px" }}
          >
            <Plus style={{ width: "16px", height: "16px" }} />
            New Deal
          </PinkButton>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px", flexShrink: 0 }}>
        <span style={{ fontSize: "12px", color: textMuted, marginRight: "4px" }}>Appetite:</span>
        {["", "Acceptable", "Referral", "Conditional", "Ineligible"].map((det) => {
          const label = det || "All";
          const isActive = appetiteFilter === det;
          const chipColors: Record<string, string> = {
            Acceptable: "#22c55e",
            Referral: "#f59e0b",
            Conditional: "#1E6BE9",
            Ineligible: "#ef4444",
          };
          const chipColor = chipColors[det] || (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)");
          return (
            <button
              key={label}
              onClick={() => setAppetiteFilter(det)}
              style={{
                padding: "4px 12px",
                borderRadius: "6px",
                border: isActive ? `1px solid ${chipColor}` : `1px solid ${borderSubtle}`,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
                background: isActive ? (det ? `${chipColor}20` : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)")) : "transparent",
                color: isActive ? chipColor : textMuted,
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
        <button
          onClick={() => setShowLost((v) => !v)}
          style={{
            marginLeft: "auto",
            padding: "4px 12px",
            borderRadius: "6px",
            border: showLost ? "1px solid #ef4444" : `1px solid ${borderSubtle}`,
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 500,
            background: showLost ? "#ef444420" : "transparent",
            color: showLost ? "#ef4444" : textMuted,
            transition: "all 0.15s",
          }}
        >
          {showLost ? "Hide Lost" : "Show Lost"}
        </button>
      </div>

      {loading ? (
        <div style={{ color: textMuted, padding: "40px", textAlign: "center" }}>Loading pipeline…</div>
      ) : showLost ? (
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "12px" }}>
          <GlassCard padding="0px">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Business", "Vertical", "Type", "State", "Stage at Loss", "WC Premium", "Created"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontWeight: 600,
                        fontSize: "12px",
                        color: textMuted,
                        borderBottom: `1px solid ${borderSubtle}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lostDeals.map((deal) => {
                  const Icon = deal.vertical ? VERTICAL_ICONS[deal.vertical] : null;
                  const stageLabel = STAGES.find((s) => s.key === deal.stage)?.label || deal.stage || "—";
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => openDealCard(deal.id)}
                      style={{ cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "10px 14px", color: textPrimary, fontWeight: 500, borderBottom: `1px solid ${borderSubtle}` }}>
                        {deal.businessName || "Untitled"}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${borderSubtle}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: textMuted }}>
                          {Icon && <Icon style={{ width: "13px", height: "13px" }} />}
                          {deal.vertical || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${borderSubtle}` }}>
                        <Badge
                          label={deal.productType === "PEO" ? "PEO" : "WC"}
                          color={deal.productType === "PEO" ? "purple" : "blue"}
                        />
                      </td>
                      <td style={{ padding: "10px 14px", color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>
                        {deal.state || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${borderSubtle}` }}>
                        <Badge label={stageLabel} color="gray" />
                      </td>
                      <td style={{ padding: "10px 14px", color: deal.wcPremium && parseFloat(deal.wcPremium) > 0 ? textPrimary : textMuted, borderBottom: `1px solid ${borderSubtle}` }}>
                        {deal.wcPremium && parseFloat(deal.wcPremium) > 0 ? formatCurrency(deal.wcPremium) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: textMuted, borderBottom: `1px solid ${borderSubtle}`, whiteSpace: "nowrap" }}>
                        {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
                {lostDeals.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: textMuted }}>
                      No lost deals.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </GlassCard>
        </div>
      ) : viewMode === "list" ? (
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "12px" }}>
          <GlassCard padding="0px">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Business", "Vertical", "Type", "State", "Stage", "WC Premium", "PEPM", "Created"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontWeight: 600,
                        fontSize: "12px",
                        color: textMuted,
                        borderBottom: `1px solid ${borderSubtle}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => {
                  const Icon = deal.vertical ? VERTICAL_ICONS[deal.vertical] : null;
                  const stageLabel = STAGES.find((s) => s.key === deal.stage)?.label || deal.stage || "—";
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => openDealCard(deal.id)}
                      style={{ cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "10px 14px", color: textPrimary, fontWeight: 500, borderBottom: `1px solid ${borderSubtle}` }}>
                        {deal.businessName || "Untitled"}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${borderSubtle}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: textMuted }}>
                          {Icon && <Icon style={{ width: "13px", height: "13px" }} />}
                          {deal.vertical || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${borderSubtle}` }}>
                        <Badge
                          label={deal.productType === "PEO" ? "PEO" : "WC"}
                          color={deal.productType === "PEO" ? "purple" : "blue"}
                        />
                      </td>
                      <td style={{ padding: "10px 14px", color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>
                        {deal.state || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${borderSubtle}` }}>
                        <Badge label={stageLabel} color="gray" />
                      </td>
                      <td style={{ padding: "10px 14px", color: deal.wcPremium && parseFloat(deal.wcPremium) > 0 ? textPrimary : textMuted, borderBottom: `1px solid ${borderSubtle}` }}>
                        {deal.wcPremium && parseFloat(deal.wcPremium) > 0 ? formatCurrency(deal.wcPremium) : "Pending Quote"}
                      </td>
                      <td style={{ padding: "10px 14px", color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>
                        {deal.productType === "PEO" ? (deal.wfsPepmRate && parseFloat(deal.wfsPepmRate) > 0 ? formatCurrency(deal.wfsPepmRate) : "Pending Quote") : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: textMuted, borderBottom: `1px solid ${borderSubtle}`, whiteSpace: "nowrap" }}>
                        {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
                {filteredDeals.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: textMuted }}>
                      No deals yet — click "New Deal" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </GlassCard>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: "12px",
            flex: 1,
            paddingBottom: "12px",
          }}
        >
          {STAGES.map((stage) => {
            const stageDeals = dealsByStage(stage.key);
            const visibleCount = visibleByStage[stage.key] ?? CARDS_PER_PAGE;
            const visibleDeals = stageDeals.slice(0, visibleCount);
            const hasMore = stageDeals.length > visibleDeals.length;
            const isDropTarget = dragOverStage === stage.key;
            return (
              <div
                key={stage.key}
                style={{ minWidth: "280px", width: "280px", flexShrink: 0, display: "flex", flexDirection: "column" }}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", paddingLeft: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: textMuted }}>{stage.num}</span>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: textMuted }}>{stage.label}</span>
                  <Badge label={String(stageDeals.length)} color="gray" />
                </div>

                <LazyColumnBody
                  hasMore={hasMore}
                  onLoadMore={() => loadMoreForStage(stage.key)}
                  isDropTarget={isDropTarget}
                  isDark={isDark}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {visibleDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openDealCard(deal.id)}
                        style={{
                          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                          border: `1px solid ${borderSubtle}`,
                          borderRadius: "10px",
                          padding: "12px",
                          cursor: "grab",
                          opacity: draggingId === deal.id ? 0.4 : 1,
                          transition: "border-color 0.15s, opacity 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "rgba(233,30,140,0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = borderSubtle;
                        }}
                      >
                        <p style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 6px" }}>
                          {deal.businessName || "Untitled"}
                        </p>

                        {deal.vertical && (() => {
                          const Icon = VERTICAL_ICONS[deal.vertical];
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                              {Icon && <Icon style={{ width: "12px", height: "12px", color: textMuted }} />}
                              <span style={{ fontSize: "12px", color: textMuted }}>{deal.vertical}</span>
                            </div>
                          );
                        })()}

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                          <Badge
                            label={deal.productType === "PEO" ? "PEO" : "WC"}
                            color={deal.productType === "PEO" ? "purple" : "blue"}
                          />
                        </div>

                        <p style={{ fontSize: "12px", color: deal.wcPremium && parseFloat(deal.wcPremium) > 0 ? textPrimary : textMuted, margin: "0 0 2px" }}>
                          {deal.wcPremium && parseFloat(deal.wcPremium) > 0
                            ? `${formatCurrency(deal.wcPremium)} WC Premium`
                            : "Pending Quote"}
                        </p>

                        {deal.productType === "PEO" && (
                          <p style={{ fontSize: "12px", color: deal.wfsPepmRate && parseFloat(deal.wfsPepmRate) > 0 ? textPrimary : textMuted, margin: 0 }}>
                            {deal.wfsPepmRate && parseFloat(deal.wfsPepmRate) > 0
                              ? `${formatCurrency(deal.wfsPepmRate)} PEPM`
                              : "Pending Quote"}
                          </p>
                        )}

                        <div style={{ display: "flex", marginTop: "8px" }}>
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: `hsl(${(i * 120 + 200) % 360}, 50%, 50%)`,
                                border: `2px solid ${isDark ? "#141418" : "#f4f4f5"}`,
                                marginLeft: i > 0 ? "-8px" : 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: 600,
                                color: "#fff",
                              }}
                              title={members[i]?.name}
                            >
                              {members[i]?.name.charAt(0)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {stageDeals.length === 0 && (
                      <div style={{ padding: "20px 8px", textAlign: "center", fontSize: "12px", color: textMuted }}>
                        No deals
                      </div>
                    )}
                  </div>
                </LazyColumnBody>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showNewDeal} onClose={() => setShowNewDeal(false)} title="New Deal">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", minWidth: "480px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Business Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
              placeholder="Enter business name"
              style={inputStyle}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>

          <div>
            <label style={labelStyle}>Vertical</label>
            <select
              value={form.vertical}
              onChange={(e) => setForm((p) => ({ ...p, vertical: e.target.value }))}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              onFocus={focusHandler}
              onBlur={blurHandler}
            >
              <option value="" style={{ background: isDark ? "#141418" : "#fff" }}>Select vertical</option>
              {VERTICALS.map((v) => (
                <option key={v} value={v} style={{ background: isDark ? "#141418" : "#fff" }}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Quote Type</label>
            <select
              value={form.productType}
              onChange={(e) => setForm((p) => ({ ...p, productType: e.target.value }))}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              onFocus={focusHandler}
              onBlur={blurHandler}
            >
              <option value="WC" style={{ background: isDark ? "#141418" : "#fff" }}>WC Only</option>
              <option value="PEO" style={{ background: isDark ? "#141418" : "#fff" }}>PEO+WC</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>State</label>
            <select
              value={form.state}
              onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              onFocus={focusHandler}
              onBlur={blurHandler}
            >
              <option value="" style={{ background: isDark ? "#141418" : "#fff" }}>Select state</option>
              {US_STATES.map((s) => (
                <option key={s} value={s} style={{ background: isDark ? "#141418" : "#fff" }}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Estimated Annual Payroll</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.annualPayroll}
              onChange={(e) => setForm((p) => ({ ...p, annualPayroll: e.target.value.replace(/[^0-9]/g, "") }))}
              placeholder="$0"
              style={inputStyle}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>

          <div>
            <label style={labelStyle}>Number of Employees</label>
            <input
              type="number"
              value={form.employeeCountFt}
              onChange={(e) => setForm((p) => ({ ...p, employeeCountFt: e.target.value }))}
              placeholder="0"
              style={inputStyle}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Assigned To</label>
            <select
              value={form.assignedTo}
              onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              onFocus={focusHandler}
              onBlur={blurHandler}
            >
              <option value="" style={{ background: isDark ? "#141418" : "#fff" }}>Select team member</option>
              {members.map((u) => (
                <option key={u.id} value={u.id} style={{ background: isDark ? "#141418" : "#fff" }}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <PinkButton
            onClick={handleCreateDeal}
            disabled={saving || !form.businessName || !form.vertical || !form.state}
            style={{ padding: "10px 24px" }}
          >
            {saving ? "Creating…" : "Create Deal"}
          </PinkButton>
          <GhostButton onClick={() => setShowNewDeal(false)} style={{ padding: "10px 24px" }}>
            Cancel
          </GhostButton>
        </div>
      </Modal>

      <Modal isOpen={bindConfirm !== null} onClose={() => setBindConfirm(null)} title="Move to Bound?">
        <div style={{ minWidth: "420px" }}>
          <p style={{ fontSize: "14px", color: textPrimary, margin: "0 0 8px" }}>
            Move <strong>{bindConfirm?.name}</strong> to <strong>Bound</strong>?
          </p>
          <p style={{ fontSize: "13px", color: textMuted, margin: 0 }}>
            Binding is gated server-side — the deal must have a completed submission and an
            approved quote. Binding also creates the implementation tracker(s).
          </p>
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <PinkButton
              onClick={() => {
                const c = bindConfirm;
                setBindConfirm(null);
                if (c) commitStageMove(c.dealId, "BOUND", c.prevStage);
              }}
              style={{ padding: "10px 24px" }}
            >
              Confirm Bind
            </PinkButton>
            <GhostButton onClick={() => setBindConfirm(null)} style={{ padding: "10px 24px" }}>
              Cancel
            </GhostButton>
          </div>
        </div>
      </Modal>

    </div>
  );
}
