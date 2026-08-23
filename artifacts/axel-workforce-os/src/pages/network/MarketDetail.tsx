import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, GhostButton, PinkButton, AxelBadge } from "@/components/ui/axel-index";
import { ArrowLeft, Edit2, Check, X, Plus, Trash2, Power, PowerOff } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { useAuthStore } from "@/lib/auth-store";
import { format } from "date-fns";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--input-border)",
  background: "var(--input-bg)", color: "var(--input-text)", fontSize: "14px", outline: "none",
};

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const isDark = theme === "dark";
  const qc = useQueryClient();
  const isAdmin = user?.role === "ADMIN";

  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryForm, setSummaryForm] = useState<any>({});

  const { data: marketResp, isLoading } = useQuery({
    queryKey: ["market", id],
    queryFn: () => api.get<{ data: any }>(`/markets/${id}`),
    enabled: !!id,
  });

  const market = marketResp?.data;

  const updateMarketMut = useMutation({
    mutationFn: (data: any) => api.patch(`/markets/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["market", id] }); setEditingSummary(false); },
  });

  const activateMut = useMutation({
    mutationFn: () => api.post(`/markets/${id}/activate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market", id] }),
    onError: (err: any) => alert(`Cannot activate: ${err.message}`),
  });

  const deactivateMut = useMutation({
    mutationFn: () => api.post(`/markets/${id}/deactivate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market", id] }),
  });

  if (isLoading || !market) return <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", padding: "40px" }}>Loading...</div>;

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  const startEditSummary = () => {
    setSummaryForm({
      name: market.name,
      isAppointed: market.isAppointed,
      effectiveDate: market.effectiveDate || "",
      expirationDate: market.expirationDate || "",
      notes: market.notes || "",
    });
    setEditingSummary(true);
  };

  return (
    <div style={{ maxWidth: "1200px", paddingBottom: "60px" }}>
      <button onClick={() => navigate("/network")} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", fontSize: "14px" }}>
        <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Network
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: textPrimary, margin: 0 }}>{market.name}</h1>
          <AxelBadge label={market.marketType === "WC_CARRIER" ? "WC Carrier" : "PEO Program"} color="blue" />
          <AxelBadge label={market.isAppointed ? "Appointed" : "Not Appointed"} color={market.isAppointed ? "green" : "red"} />
          <AxelBadge label={market.isActive ? "Active" : "Inactive"} color={market.isActive ? "green" : "gray"} />
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "8px" }}>
            {market.isActive ? (
              <GhostButton onClick={() => deactivateMut.mutate()} disabled={deactivateMut.isPending} style={{ color: "#E91E1E" }}>
                <PowerOff style={{ width: 14, height: 14 }} /> Deactivate
              </GhostButton>
            ) : (
              <GhostButton onClick={() => activateMut.mutate()} disabled={activateMut.isPending} style={{ color: "#1EE97B" }}>
                <Power style={{ width: 14, height: 14 }} /> Activate
              </GhostButton>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", marginBottom: "24px" }}>
        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Summary</h3>
            {isAdmin && (
              editingSummary ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <GhostButton onClick={() => updateMarketMut.mutate(summaryForm)}><Check style={{ width: 14, height: 14 }} /></GhostButton>
                  <GhostButton onClick={() => setEditingSummary(false)}><X style={{ width: 14, height: 14 }} /></GhostButton>
                </div>
              ) : (
                <GhostButton onClick={startEditSummary}><Edit2 style={{ width: 14, height: 14 }} /> Edit</GhostButton>
              )
            )}
          </div>
          
          {editingSummary ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Name</label><input value={summaryForm.name || ""} onChange={(e) => setSummaryForm({ ...summaryForm, name: e.target.value })} style={inputStyle} /></div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" checked={summaryForm.isAppointed || false} onChange={(e) => setSummaryForm({ ...summaryForm, isAppointed: e.target.checked })} />
                <label style={{ fontSize: "13px", color: textPrimary }}>Is Appointed</label>
              </div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Effective Date</label><input type="date" value={summaryForm.effectiveDate || ""} onChange={(e) => setSummaryForm({ ...summaryForm, effectiveDate: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Expiration Date</label><input type="date" value={summaryForm.expirationDate || ""} onChange={(e) => setSummaryForm({ ...summaryForm, expirationDate: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Notes</label><textarea value={summaryForm.notes || ""} onChange={(e) => setSummaryForm({ ...summaryForm, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Field label="Name" value={market.name} isDark={isDark} />
              <Field label="Dates" value={`${market.effectiveDate ? format(new Date(market.effectiveDate), "MMM d, yyyy") : "TBD"} — ${market.expirationDate ? format(new Date(market.expirationDate), "MMM d, yyyy") : "Ongoing"}`} isDark={isDark} />
              <Field label="Notes" value={market.notes} isDark={isDark} />
              {!market.isActive && market.statusReason && (
                <div style={{ padding: "8px 12px", background: "rgba(233,30,30,0.1)", borderLeft: "2px solid #E91E1E", borderRadius: "4px" }}>
                  <p style={{ fontSize: "12px", color: "#E91E1E", margin: 0, fontWeight: 500 }}>Deactivation Reason:</p>
                  <p style={{ fontSize: "13px", color: textPrimary, margin: "2px 0 0 0" }}>{market.statusReason}</p>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <UnderwritersSection marketId={id!} isAdmin={isAdmin} isDark={isDark} />
          <AppetiteSection marketId={id!} isAdmin={isAdmin} isDark={isDark} marketLane={market.productLane} />
        </div>
      </div>

      <RateSetsSection marketId={id!} isAdmin={isAdmin} isDark={isDark} marketLane={market.productLane} />
    </div>
  );
}

function Field({ label, value, isDark }: { label: string; value?: string | null; isDark: boolean }) {
  return (
    <div>
      <p style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", margin: 0 }}>{label}</p>
      <p style={{ fontSize: "14px", color: isDark ? "#fff" : "#111", margin: "2px 0 0" }}>{value || "—"}</p>
    </div>
  );
}

function MarketModal({
  title,
  children,
  footer,
  onClose,
  isDark,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  isDark: boolean;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "grid",
        placeItems: "center",
        padding: "16px",
        background: "rgba(3, 4, 8, 0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: "min(560px, calc(100vw - 32px))",
          maxHeight: "calc(100dvh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: isDark ? "rgba(20, 20, 28, 0.98)" : "rgba(255, 255, 255, 0.98)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`,
          borderRadius: "16px",
          boxShadow: isDark ? "0 28px 96px rgba(0,0,0,0.72)" : "0 28px 88px rgba(0,0,0,0.25)",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "20px 24px 16px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: isDark ? "#fff" : "#111", margin: 0 }}>{title}</h3>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose} style={{ width: "32px", height: "32px", display: "grid", placeItems: "center", border: "none", borderRadius: "8px", color: isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.62)", background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", cursor: "pointer" }}>
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </header>
        <div style={{ minHeight: 0, overflowY: "auto", padding: "20px 24px" }}>{children}</div>
        <footer style={{ display: "flex", gap: "8px", padding: "16px 24px 20px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
          {footer}
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function UnderwritersSection({ marketId, isAdmin, isDark }: { marketId: string, isAdmin: boolean, isDark: boolean }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  const { data: resp } = useQuery({
    queryKey: ["market", marketId, "underwriters"],
    queryFn: () => api.get<{ data: any[] }>(`/markets/${marketId}/underwriters`),
  });
  const underwriters = resp?.data || [];

  const delMut = useMutation({
    mutationFn: (uwId: string) => api.delete(`/markets/${marketId}/underwriters/${uwId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market", marketId, "underwriters"] }),
  });

  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Routing Underwriters</h3>
        {isAdmin && (
          <GhostButton onClick={() => setShowAdd(true)} style={{ padding: "4px 8px" }}><Plus style={{ width: 14, height: 14 }} /> Add</GhostButton>
        )}
      </div>

      {underwriters.length === 0 ? (
        <p style={{ fontSize: "13px", color: textMuted }}>No underwriters configured.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {underwriters.map((uw: any) => (
            <div key={uw.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: 0 }}>{uw.name}</p>
                <p style={{ fontSize: "12px", color: textMuted, margin: "2px 0 0" }}>{uw.email}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AxelBadge label={uw.isActive ? "Active" : "Inactive"} color={uw.isActive ? "green" : "gray"} />
                {isAdmin && (
                  <button onClick={() => delMut.mutate(uw.id)} style={{ background: "none", border: "none", color: "#E91E1E", cursor: "pointer", padding: "4px" }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddUnderwriterModal marketId={marketId} onClose={() => setShowAdd(false)} isDark={isDark} />}
    </GlassCard>
  );
}

function AddUnderwriterModal({ marketId, onClose, isDark }: { marketId: string, onClose: () => void, isDark: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", isActive: true });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post(`/markets/${marketId}/underwriters`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["market", marketId, "underwriters"] }); onClose(); },
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-bg)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, borderRadius: "16px", padding: "24px", boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: isDark ? "#fff" : "#111", margin: "0 0 16px 0" }}>Add Underwriter</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} /></div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <PinkButton onClick={() => createMut.mutate(form)} disabled={!form.name || !form.email || createMut.isPending} style={{ flex: 1 }}>Save</PinkButton>
            <GhostButton onClick={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppetiteSection({ marketId, isAdmin, isDark, marketLane }: { marketId: string, isAdmin: boolean, isDark: boolean, marketLane: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  const { data: resp } = useQuery({
    queryKey: ["market", marketId, "appetite-rules"],
    queryFn: () => api.get<{ data: any[] }>(`/markets/${marketId}/appetite-rules`),
  });
  const rules = resp?.data || [];

  const delMut = useMutation({
    mutationFn: (ruleId: string) => api.delete(`/markets/${marketId}/appetite-rules/${ruleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market", marketId, "appetite-rules"] }),
  });

  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Appetite Rules</h3>
        {isAdmin && (
          <GhostButton onClick={() => setShowAdd(true)} style={{ padding: "4px 8px" }}><Plus style={{ width: 14, height: 14 }} /> Add Rule</GhostButton>
        )}
      </div>

      {rules.length === 0 ? (
        <p style={{ fontSize: "13px", color: textMuted }}>No appetite rules configured.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rules.map((rule: any) => (
            <div key={rule.id} style={{ padding: "12px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <AxelBadge label={rule.appetiteOutcome} color={rule.appetiteOutcome === "MATCHED" ? "green" : rule.appetiteOutcome === "CONDITIONAL" ? "yellow" : "red"} />
                    {rule.vertical && <span style={{ fontSize: "12px", color: textPrimary }}>{rule.vertical}</span>}
                  </div>
                  <p style={{ fontSize: "12px", color: textMuted, margin: "8px 0 0" }}>
                    {rule.eligibleStates?.length ? `States: ${rule.eligibleStates.join(", ")} | ` : ""}
                    {rule.eligibleClassCodes?.length ? `Classes: ${rule.eligibleClassCodes.join(", ")} | ` : ""}
                    {rule.eligibleIndustries?.length ? `Industries: ${rule.eligibleIndustries.join(", ")} | ` : ""}
                    {rule.payrollMin || rule.payrollMax ? `Payroll: $${rule.payrollMin || 0} - $${rule.payrollMax || "∞"} | ` : ""}
                    {rule.premiumMin || rule.premiumMax ? `Premium: $${rule.premiumMin || 0} - $${rule.premiumMax || "∞"} | ` : ""}
                    {rule.headcountMin || rule.headcountMax ? `HC: ${rule.headcountMin || 0} - ${rule.headcountMax || "∞"}` : ""}
                  </p>
                  {rule.conditions && rule.conditions.length > 0 && (
                    <div style={{ marginTop: "6px", padding: "6px 8px", background: "rgba(0,0,0,0.1)", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace", color: textPrimary, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(rule.conditions)}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isAdmin && (
                    <button onClick={() => delMut.mutate(rule.id)} style={{ background: "none", border: "none", color: "#E91E1E", cursor: "pointer", padding: "4px" }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddAppetiteModal marketId={marketId} marketLane={marketLane} onClose={() => setShowAdd(false)} isDark={isDark} />}
    </GlassCard>
  );
}

function AddAppetiteModal({ marketId, marketLane, onClose, isDark }: { marketId: string, marketLane: string, onClose: () => void, isDark: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({ 
    productLane: marketLane,
    appetiteOutcome: "MATCHED",
    vertical: "",
    eligibleStates: "",
    eligibleClassCodes: "",
    eligibleIndustries: "",
    payrollMin: "",
    payrollMax: "",
    premiumMin: "",
    premiumMax: "",
    headcountMin: "",
    headcountMax: "",
    primaryUnderwriterId: "",
    conditionsJson: "",
  });

  const { data: uwResp } = useQuery({
    queryKey: ["market", marketId, "underwriters"],
    queryFn: () => api.get<{ data: any[] }>(`/markets/${marketId}/underwriters`),
  });
  const underwriters = uwResp?.data || [];

  const createMut = useMutation({
    mutationFn: (data: any) => api.post(`/markets/${marketId}/appetite-rules`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["market", marketId, "appetite-rules"] }); onClose(); },
  });

  const handleSubmit = () => {
    const payload = { ...form };
    if (payload.eligibleStates) payload.eligibleStates = payload.eligibleStates.split(",").map((s: string) => s.trim().toUpperCase());
    else delete payload.eligibleStates;

    if (payload.eligibleClassCodes) payload.eligibleClassCodes = payload.eligibleClassCodes.split(",").map((s: string) => s.trim());
    else delete payload.eligibleClassCodes;

    if (payload.eligibleIndustries) payload.eligibleIndustries = payload.eligibleIndustries.split(",").map((s: string) => s.trim());
    else delete payload.eligibleIndustries;

    if (!payload.payrollMin) delete payload.payrollMin; else payload.payrollMin = String(payload.payrollMin);
    if (!payload.payrollMax) delete payload.payrollMax; else payload.payrollMax = String(payload.payrollMax);
    if (!payload.premiumMin) delete payload.premiumMin; else payload.premiumMin = String(payload.premiumMin);
    if (!payload.premiumMax) delete payload.premiumMax; else payload.premiumMax = String(payload.premiumMax);
    if (!payload.headcountMin) delete payload.headcountMin; else payload.headcountMin = parseInt(payload.headcountMin, 10);
    if (!payload.headcountMax) delete payload.headcountMax; else payload.headcountMax = parseInt(payload.headcountMax, 10);

    if (!payload.vertical) delete payload.vertical;
    if (!payload.primaryUnderwriterId) delete payload.primaryUnderwriterId;

    if (payload.appetiteOutcome === "CONDITIONAL" && payload.conditionsJson) {
      try {
        payload.conditions = JSON.parse(payload.conditionsJson);
      } catch (e) {
        alert("Invalid JSON in conditions");
        return;
      }
    }
    delete payload.conditionsJson;

    createMut.mutate(payload);
  };

  return (
    <MarketModal
      title="Add Appetite Rule"
      onClose={onClose}
      isDark={isDark}
      footer={
        <>
          <GhostButton onClick={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
          <PinkButton onClick={handleSubmit} disabled={!form.primaryUnderwriterId || createMut.isPending} style={{ flex: 1 }}>
            {createMut.isPending ? "Saving…" : "Save rule"}
          </PinkButton>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Outcome</label>
            <select value={form.appetiteOutcome} onChange={(e) => setForm({ ...form, appetiteOutcome: e.target.value })} style={inputStyle}>
              <option value="MATCHED">Matched</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="REFERRAL">Referral</option>
            </select>
          </div>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Vertical (optional)</label><input value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Eligible States (comma separated, e.g. CA, NY)</label><input value={form.eligibleStates} onChange={(e) => setForm({ ...form, eligibleStates: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Eligible Class Codes (comma separated)</label><input value={form.eligibleClassCodes} onChange={(e) => setForm({ ...form, eligibleClassCodes: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Eligible Industries (comma separated)</label><input value={form.eligibleIndustries} onChange={(e) => setForm({ ...form, eligibleIndustries: e.target.value })} style={inputStyle} /></div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Min Payroll ($)</label><input type="number" value={form.payrollMin} onChange={(e) => setForm({ ...form, payrollMin: e.target.value })} style={inputStyle} /></div>
            <div style={{ flex: 1 }}><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Max Payroll ($)</label><input type="number" value={form.payrollMax} onChange={(e) => setForm({ ...form, payrollMax: e.target.value })} style={inputStyle} /></div>
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Min Premium ($)</label><input type="number" value={form.premiumMin} onChange={(e) => setForm({ ...form, premiumMin: e.target.value })} style={inputStyle} /></div>
            <div style={{ flex: 1 }}><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Max Premium ($)</label><input type="number" value={form.premiumMax} onChange={(e) => setForm({ ...form, premiumMax: e.target.value })} style={inputStyle} /></div>
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Min Headcount</label><input type="number" value={form.headcountMin} onChange={(e) => setForm({ ...form, headcountMin: e.target.value })} style={inputStyle} /></div>
            <div style={{ flex: 1 }}><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Max Headcount</label><input type="number" value={form.headcountMax} onChange={(e) => setForm({ ...form, headcountMax: e.target.value })} style={inputStyle} /></div>
          </div>

          {form.appetiteOutcome === "CONDITIONAL" && (
            <div>
              <label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Conditions (JSON array of objects, e.g. [{`{ "field": "eMod", "op": "<", "value": 1.5 }`}])</label>
              <textarea value={form.conditionsJson} onChange={(e) => setForm({ ...form, conditionsJson: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: "12px" }} placeholder='[{"field": "eMod", "op": "<", "value": 1.5}]' />
            </div>
          )}

          <div>
            <label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Primary Underwriter * (Required for routing)</label>
            <select value={form.primaryUnderwriterId} onChange={(e) => setForm({ ...form, primaryUnderwriterId: e.target.value })} style={inputStyle}>
              <option value="">-- Select Underwriter --</option>
              {underwriters.map((uw: any) => (
                <option key={uw.id} value={uw.id}>{uw.name}</option>
              ))}
            </select>
          </div>

      </div>
    </MarketModal>
  );
}

function RateSetsSection({ marketId, isAdmin, isDark, marketLane }: { marketId: string, isAdmin: boolean, isDark: boolean, marketLane: string }) {
  const qc = useQueryClient();
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const [showAddSet, setShowAddSet] = useState(false);
  const [selectedRateSetId, setSelectedRateSetId] = useState<string | null>(null);

  const { data: rsResp } = useQuery({
    queryKey: ["market", marketId, "rate-sets"],
    queryFn: () => api.get<{ data: any[] }>(`/markets/${marketId}/rate-sets`),
  });
  const rateSets = rsResp?.data || [];

  const delRsMut = useMutation({
    mutationFn: (rsId: string) => api.delete(`/markets/${marketId}/rate-sets/${rsId}`),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["market", marketId, "rate-sets"] });
      if (selectedRateSetId) setSelectedRateSetId(null);
    },
  });

  const activeRateSet = rateSets.find((rs: any) => rs.id === selectedRateSetId) || rateSets[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Rate Sets</h3>
          {isAdmin && (
            <GhostButton onClick={() => setShowAddSet(true)} style={{ padding: "4px 8px" }}><Plus style={{ width: 14, height: 14 }} /> Add Rate Set</GhostButton>
          )}
        </div>

        {rateSets.length === 0 ? (
          <p style={{ fontSize: "13px", color: textMuted }}>No rate sets configured.</p>
        ) : (
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px" }}>
            {rateSets.map((rs: any) => {
              const isSelected = activeRateSet?.id === rs.id;
              return (
                <button
                  key={rs.id}
                  onClick={() => setSelectedRateSetId(rs.id)}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", border: `1px solid ${isSelected ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                    background: isSelected ? "rgba(233,30,140,0.1)" : "transparent",
                    color: textPrimary, cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px",
                    textAlign: "left"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>v{rs.version}</span>
                    <AxelBadge label={rs.status} color={rs.status === "ACTIVE" ? "green" : rs.status === "DRAFT" ? "yellow" : "gray"} />
                  </div>
                  <span style={{ fontSize: "12px", color: textMuted }}>{rs.sourceType}</span>
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>

      {activeRateSet && (
        <RateRulesSection marketId={marketId} rateSet={activeRateSet} isAdmin={isAdmin} isDark={isDark} marketLane={marketLane} />
      )}

      {showAddSet && <AddRateSetModal marketId={marketId} marketLane={marketLane} onClose={() => setShowAddSet(false)} isDark={isDark} />}
    </div>
  );
}

function AddRateSetModal({ marketId, marketLane, onClose, isDark }: { marketId: string, marketLane: string, onClose: () => void, isDark: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({ 
    productLane: marketLane,
    sourceType: "MANUAL",
    version: 1,
    status: "DRAFT",
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post(`/markets/${marketId}/rate-sets`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["market", marketId, "rate-sets"] }); onClose(); },
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-bg)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, borderRadius: "16px", padding: "24px", boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: isDark ? "#fff" : "#111", margin: "0 0 16px 0" }}>Add Rate Set</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Version (Number)</label><input type="number" value={form.version} onChange={(e) => setForm({ ...form, version: parseInt(e.target.value) })} style={inputStyle} /></div>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Source Type</label>
            <select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })} style={inputStyle}>
              <option value="MANUAL">Manual</option>
              <option value="IMPORT">Import</option>
              <option value="API">API</option>
            </select>
          </div>
          <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <PinkButton onClick={() => createMut.mutate(form)} disabled={createMut.isPending} style={{ flex: 1 }}>Save</PinkButton>
            <GhostButton onClick={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function RateRulesSection({ marketId, rateSet, isAdmin, isDark, marketLane }: { marketId: string, rateSet: any, isAdmin: boolean, isDark: boolean, marketLane: string }) {
  const qc = useQueryClient();
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const [showAddRule, setShowAddRule] = useState(false);

  const { data: rrResp } = useQuery({
    queryKey: ["market", marketId, "rate-sets", rateSet.id, "rules"],
    queryFn: () => api.get<{ data: any[] }>(`/markets/${marketId}/rate-sets/${rateSet.id}/rules`),
  });
  const rules = rrResp?.data || [];

  const delRrMut = useMutation({
    mutationFn: (ruleId: string) => api.delete(`/markets/${marketId}/rate-sets/${rateSet.id}/rules/${ruleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market", marketId, "rate-sets", rateSet.id, "rules"] }),
  });

  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Rate Rules (v{rateSet.version})</h3>
        {isAdmin && (
          <GhostButton onClick={() => setShowAddRule(true)} style={{ padding: "4px 8px" }}><Plus style={{ width: 14, height: 14 }} /> Add Rule</GhostButton>
        )}
      </div>

      {rules.length === 0 ? (
        <p style={{ fontSize: "13px", color: textMuted }}>No rules defined for this rate set.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rules.map((rule: any) => (
            <div key={rule.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
              {rule.ruleType === "WC" ? (
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: textPrimary, margin: 0 }}>State: {rule.ruleData?.state} | Class: {rule.ruleData?.classCode}</p>
                  <p style={{ fontSize: "12px", color: textMuted, margin: "4px 0 0" }}>
                    Base: ${rule.ruleData?.baseRate} | Min Prem: ${rule.ruleData?.minimumPremium} | Multiplier: {rule.ruleData?.stateMultiplier}
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: textPrimary, margin: 0 }}>Admin Fee %: {rule.ruleData?.adminFeePercent}% | WC Load: {rule.ruleData?.wcLoadFactor}</p>
                  <p style={{ fontSize: "12px", color: textMuted, margin: "4px 0 0" }}>
                    Base PEPM: ${rule.ruleData?.wfsBasePepm} | HC Discount: {rule.ruleData?.headcountDiscount || 0} | Min Ann WC: ${rule.ruleData?.minimumAnnualWc}
                  </p>
                </div>
              )}
              {isAdmin && (
                <button onClick={() => delRrMut.mutate(rule.id)} style={{ background: "none", border: "none", color: "#E91E1E", cursor: "pointer", padding: "4px" }}><Trash2 style={{ width: 14, height: 14 }} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddRule && <AddRateRuleModal marketId={marketId} rateSetId={rateSet.id} marketLane={marketLane} onClose={() => setShowAddRule(false)} isDark={isDark} />}
    </GlassCard>
  );
}

function AddRateRuleModal({ marketId, rateSetId, marketLane, onClose, isDark }: { marketId: string, rateSetId: string, marketLane: string, onClose: () => void, isDark: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});

  const createMut = useMutation({
    mutationFn: (data: any) => api.post(`/markets/${marketId}/rate-sets/${rateSetId}/rules`, { ruleType: marketLane, ruleData: data }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["market", marketId, "rate-sets", rateSetId, "rules"] }); onClose(); },
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-bg)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, borderRadius: "16px", padding: "24px", boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: isDark ? "#fff" : "#111", margin: "0 0 16px 0" }}>Add {marketLane} Rate Rule</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          
          {marketLane === "WC" ? (
            <>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>State (e.g. CA)</label><input value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} style={inputStyle} maxLength={2} /></div>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Class Code</label><input value={form.classCode || ""} onChange={(e) => setForm({ ...form, classCode: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Base Rate ($)</label><input type="number" step="0.01" value={form.baseRate || ""} onChange={(e) => setForm({ ...form, baseRate: parseFloat(e.target.value) })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Minimum Premium ($)</label><input type="number" value={form.minimumPremium || ""} onChange={(e) => setForm({ ...form, minimumPremium: parseInt(e.target.value) })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>State Multiplier</label><input type="number" step="0.01" value={form.stateMultiplier || ""} onChange={(e) => setForm({ ...form, stateMultiplier: parseFloat(e.target.value) })} style={inputStyle} /></div>
            </>
          ) : (
            <>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>WC Load Factor</label><input type="number" step="0.01" value={form.wcLoadFactor || ""} onChange={(e) => setForm({ ...form, wcLoadFactor: parseFloat(e.target.value) })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Base PEPM ($)</label><input type="number" value={form.wfsBasePepm || ""} onChange={(e) => setForm({ ...form, wfsBasePepm: parseFloat(e.target.value) })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Admin Fee Percent (%)</label><input type="number" step="0.01" value={form.adminFeePercent || ""} onChange={(e) => setForm({ ...form, adminFeePercent: parseFloat(e.target.value) })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Headcount Discount</label><input type="number" step="0.01" value={form.headcountDiscount || ""} onChange={(e) => setForm({ ...form, headcountDiscount: parseFloat(e.target.value) })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)" }}>Minimum Annual WC ($)</label><input type="number" value={form.minimumAnnualWc || ""} onChange={(e) => setForm({ ...form, minimumAnnualWc: parseInt(e.target.value) })} style={inputStyle} /></div>
            </>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <PinkButton onClick={() => createMut.mutate(form)} disabled={createMut.isPending} style={{ flex: 1 }}>Save</PinkButton>
            <GhostButton onClick={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
          </div>
        </div>
      </div>
    </div>
  );
}