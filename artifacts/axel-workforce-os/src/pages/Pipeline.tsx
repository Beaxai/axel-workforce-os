import { useState, useEffect, useCallback, type DragEvent } from "react";
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
import DealCardModal from "@/components/DealCardModal";
import {
  Cannabis,
  HardHat,
  UsersRound,
  HeartPulse,
  UtensilsCrossed,
  Truck,
  Factory,
  ShoppingBag,
  Plus,
  Columns3,
  List,
  type LucideIcon,
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
  wcPremium?: string;
  wfsPepmRate?: string;
  ownerId?: string;
  createdAt?: string;
}

const STAGES = [
  { num: 1, key: "SUBMISSION_REVIEW", label: "Submission Review" },
  { num: 2, key: "INDICATION", label: "Indication" },
  { num: 3, key: "UW_REVIEW", label: "U/W Review" },
  { num: 4, key: "APPROVED_QUOTED", label: "Approved / Quoted" },
  { num: 5, key: "BIND_ORDER", label: "Bind Order" },
  { num: 6, key: "BOUND", label: "Bound" },
  { num: 7, key: "CLIENT", label: "Client" },
  { num: 8, key: "LOST", label: "Lost" },
];

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

const VERTICAL_ICONS: Record<string, LucideIcon> = {
  Cannabis,
  Construction: HardHat,
  Staffing: UsersRound,
  Healthcare: HeartPulse,
  Hospitality: UtensilsCrossed,
  Transportation: Truck,
  Manufacturing: Factory,
  Retail: ShoppingBag,
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const PLACEHOLDER_USERS = [
  { id: "u1", name: "Alex Morgan" },
  { id: "u2", name: "Sarah Chen" },
  { id: "u3", name: "James Rivera" },
  { id: "u4", name: "Priya Patel" },
];

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
  const isDark = theme === "dark";
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

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
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const fetchDeals = useCallback(async () => {
    try {
      const data = await api.get<Deal[]>("/deals");
      setDeals(data);
    } catch (err) {
      console.error("Failed to fetch deals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const dealsByStage = (stageKey: string) =>
    deals.filter((d) => (d.stage || "SUBMISSION_REVIEW") === stageKey);

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
        stage: "SUBMISSION_REVIEW",
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

  const handleDrop = async (e: DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData("text/plain");
    if (!dealId) return;
    setDraggingId(null);

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === stageKey) return;

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: stageKey } : d))
    );

    if (stageKey === "BOUND") {
      console.log(`Implementation trigger fired for deal ${dealId}`);
    }

    try {
      await api.patch(`/deals/${dealId}`, { stage: stageKey });
    } catch (err) {
      console.error("Failed to update deal stage:", err);
      fetchDeals();
    }
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
    e.currentTarget.style.borderColor = "#E91E8C";
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
                color: viewMode === "kanban" ? "#E91E8C" : textMuted,
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
                color: viewMode === "list" ? "#E91E8C" : textMuted,
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

      {loading ? (
        <div style={{ color: textMuted, padding: "40px", textAlign: "center" }}>Loading pipeline…</div>
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
                {deals.map((deal) => {
                  const Icon = deal.vertical ? VERTICAL_ICONS[deal.vertical] : null;
                  const stageLabel = STAGES.find((s) => s.key === deal.stage)?.label || deal.stage || "—";
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
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
                          color={deal.productType === "PEO" ? "#E91E8C" : "#1E6BE9"}
                        />
                      </td>
                      <td style={{ padding: "10px 14px", color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>
                        {deal.state || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${borderSubtle}` }}>
                        <Badge label={stageLabel} color="gray" />
                      </td>
                      <td style={{ padding: "10px 14px", color: textPrimary, borderBottom: `1px solid ${borderSubtle}` }}>
                        {formatCurrency(deal.wcPremium)}
                      </td>
                      <td style={{ padding: "10px 14px", color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>
                        {deal.productType === "PEO" && deal.wfsPepmRate ? formatCurrency(deal.wfsPepmRate) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: textMuted, borderBottom: `1px solid ${borderSubtle}`, whiteSpace: "nowrap" }}>
                        {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
                {deals.length === 0 && (
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
            overflowX: "auto",
            flex: 1,
            paddingBottom: "12px",
          }}
        >
          {STAGES.map((stage) => {
            const stageDeals = dealsByStage(stage.key);
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

                <GlassCard
                  padding="8px"
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    minHeight: "200px",
                    borderColor: isDropTarget ? "rgba(233,30,140,0.4)" : undefined,
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedDeal(deal)}
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
                            color={deal.productType === "PEO" ? "#E91E8C" : "#1E6BE9"}
                          />
                        </div>

                        <p style={{ fontSize: "12px", color: textMuted, margin: "0 0 2px" }}>
                          {formatCurrency(deal.wcPremium)} WC Premium
                        </p>

                        {deal.productType === "PEO" && deal.wfsPepmRate && (
                          <p style={{ fontSize: "12px", color: textMuted, margin: 0 }}>
                            {formatCurrency(deal.wfsPepmRate)} PEPM
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
                              title={PLACEHOLDER_USERS[i]?.name}
                            >
                              {PLACEHOLDER_USERS[i]?.name.charAt(0)}
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
                </GlassCard>
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
              {PLACEHOLDER_USERS.map((u) => (
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

      <DealCardModal
        dealId={selectedDeal?.id || ""}
        isOpen={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onDealUpdated={fetchDeals}
      />
    </div>
  );
}
