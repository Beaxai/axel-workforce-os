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
  { num: 1, key: "NEW_LEAD", label: "New Lead" },
  { num: 2, key: "QUALIFIED", label: "Qualified" },
  { num: 3, key: "NEEDS_ANALYSIS", label: "Needs Analysis" },
  { num: 4, key: "PROPOSAL_SENT", label: "Proposal Sent" },
  { num: 5, key: "NEGOTIATION", label: "Negotiation" },
  { num: 6, key: "DECISION_PENDING", label: "Decision Pending" },
  { num: 7, key: "COMMITTED", label: "Committed" },
  { num: 8, key: "DOCUMENTATION", label: "Documentation" },
  { num: 9, key: "BOUND", label: "Bound" },
  { num: 10, key: "CLIENT", label: "Client" },
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
    deals.filter((d) => (d.stage || "NEW_LEAD") === stageKey);

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
        stage: "NEW_LEAD",
      };
      if (form.assignedTo) {
        payload.ownerId = form.assignedTo;
      }
      await api.post<Deal>("/deals", payload);
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
        <PinkButton
          onClick={() => setShowNewDeal(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", marginTop: "4px" }}
        >
          <Plus style={{ width: "16px", height: "16px" }} />
          New Deal
        </PinkButton>
      </div>

      {loading ? (
        <div style={{ color: textMuted, padding: "40px", textAlign: "center" }}>Loading pipeline…</div>
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

      <Modal isOpen={!!selectedDeal} onClose={() => setSelectedDeal(null)} title={selectedDeal?.businessName || "Deal"}>
        <div style={{ minWidth: "400px" }}>
          <p style={{ color: textMuted, fontSize: "13px", margin: "0 0 12px" }}>
            Deal details modal — full implementation coming in Phase 7.
          </p>
          {selectedDeal && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "12px", color: textMuted }}>Vertical</span>
                <p style={{ color: textPrimary, margin: "2px 0 0", fontSize: "14px" }}>{selectedDeal.vertical || "—"}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: textMuted }}>Quote Type</span>
                <p style={{ color: textPrimary, margin: "2px 0 0", fontSize: "14px" }}>{selectedDeal.productType || "—"}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: textMuted }}>State</span>
                <p style={{ color: textPrimary, margin: "2px 0 0", fontSize: "14px" }}>{selectedDeal.state || "—"}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: textMuted }}>Stage</span>
                <p style={{ color: textPrimary, margin: "2px 0 0", fontSize: "14px" }}>
                  {STAGES.find((s) => s.key === selectedDeal.stage)?.label || selectedDeal.stage}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: textMuted }}>WC Premium</span>
                <p style={{ color: textPrimary, margin: "2px 0 0", fontSize: "14px" }}>{formatCurrency(selectedDeal.wcPremium)}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: textMuted }}>Reference</span>
                <p style={{ color: textPrimary, margin: "2px 0 0", fontSize: "14px" }}>{selectedDeal.referenceCode}</p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
