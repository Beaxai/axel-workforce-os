import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SectionHeader, GlassCard, PinkButton, GhostButton, Modal } from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";
import { api } from "@/lib/api";
import ProposalPanel from "@/components/ProposalPanel";
import { Loader, CheckCircle } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];


interface QuoteForm {
  businessName: string;
  state: string;
  annualPayroll: string;
  employeeCount: string;
  classCode: string;
  eMod: string;
  scheduleRating: string;
}

interface FieldErrors {
  [key: string]: string;
}

export default function QuoteNew() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const proposalRef = useRef<HTMLDivElement>(null);

  const { vertical, quoteType, prefill } = (location.state as {
    vertical?: string;
    quoteType?: string;
    prefill?: {
      businessName?: string;
      state?: string;
      annualPayroll?: string;
      employeeCount?: string;
      classCode?: string;
      eMod?: string;
      scheduleRating?: string;
    };
  }) || {};

  useEffect(() => {
    if (!vertical || !quoteType) {
      navigate("/marketplace", { replace: true });
    }
  }, [vertical, quoteType, navigate]);

  const [form, setForm] = useState<QuoteForm>({
    businessName: prefill?.businessName || "",
    state: prefill?.state || "",
    annualPayroll: prefill?.annualPayroll || "",
    employeeCount: prefill?.employeeCount || "",
    classCode: prefill?.classCode || "",
    eMod: prefill?.eMod || "1.0",
    scheduleRating: prefill?.scheduleRating || "1.0",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [calculating, setCalculating] = useState(false);
  const [apiError, setApiError] = useState("");
  const [wcBreakdown, setWcBreakdown] = useState<any>(null);
  const [wfsBreakdown, setWfsBreakdown] = useState<any>(null);
  const [showSaveDeal, setShowSaveDeal] = useState(false);
  const [savingDeal, setSavingDeal] = useState(false);
  const [toast, setToast] = useState<{ message: string; dealId: string } | null>(null);

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const update = (field: keyof QuoteForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return "";
    return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
  };

  const handlePayrollChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    update("annualPayroll", digits);
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!form.businessName.trim()) errors.businessName = "Required";
    if (!form.state) errors.state = "Required";
    if (!form.annualPayroll || parseFloat(form.annualPayroll) <= 0) errors.annualPayroll = "Must be greater than 0";
    if (!form.employeeCount || parseInt(form.employeeCount) <= 0) errors.employeeCount = "Must be at least 1";
    if (!form.classCode.trim()) errors.classCode = "Required";
    const eMod = parseFloat(form.eMod);
    if (isNaN(eMod) || eMod < 0.5 || eMod > 2.0) errors.eMod = "Must be 0.5–2.0";
    const sr = parseFloat(form.scheduleRating);
    if (isNaN(sr) || sr < 0.5 || sr > 2.0) errors.scheduleRating = "Must be 0.5–2.0";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCalculate = async () => {
    if (!validate()) return;
    setCalculating(true);
    setApiError("");
    setWcBreakdown(null);
    setWfsBreakdown(null);

    const isPEO = quoteType === "PEO+WC" || quoteType === "PEO";

    try {
      const wcPayload = {
        state: form.state,
        classCode: form.classCode,
        annualPayroll: parseFloat(form.annualPayroll),
        eMod: parseFloat(form.eMod),
        scheduleRating: parseFloat(form.scheduleRating),
        isPEO,
      };

      const wcRes = await api.post<{ success: boolean; data: any; error?: string }>("/rate/wc", wcPayload);
      if (!wcRes.success) throw new Error(wcRes.error || "Rating calculation failed");

      let wfsData = null;
      if (isPEO) {
        const wfsRes = await api.post<{ success: boolean; data: any; error?: string }>("/rate/wfs", {
          annualPayroll: parseFloat(form.annualPayroll),
          headcount: parseInt(form.employeeCount),
        });
        if (!wfsRes.success) throw new Error(wfsRes.error || "WFS calculation failed");
        wfsData = wfsRes.data;
      }

      setWcBreakdown(wcRes.data);
      if (wfsData) setWfsBreakdown(wfsData);

      setTimeout(() => {
        proposalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: any) {
      const msg = err.message || "Rating calculation failed";
      try { const parsed = JSON.parse(msg); setApiError(typeof parsed === "string" ? parsed : msg); } catch { setApiError(msg); }
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveDeal = async () => {
    setSavingDeal(true);
    try {
      const isPEO = quoteType === "PEO+WC" || quoteType === "PEO";
      const refTs = Date.now().toString(36).toUpperCase();
      const refRand = Math.random().toString(36).substring(2, 6).toUpperCase();
      const referenceCode = `AX-${refTs}-${refRand}`;

      const dealPayload: Record<string, unknown> = {
        referenceCode,
        businessName: form.businessName,
        vertical: vertical,
        productType: isPEO ? "PEO" : "WC",
        state: form.state,
        annualPayroll: form.annualPayroll,
        employeeCountFt: parseInt(form.employeeCount),
        stage: "SUBMISSION_REVIEW",
        wcPremium: wcBreakdown ? String(wcBreakdown.result.wcPremium) : undefined,
        wfsPepmRate: wfsBreakdown ? String(wfsBreakdown.result.pepm) : undefined,
      };

      const newDeal = await api.post<{ id: string }>("/deals", dealPayload);

      await api.post("/rate/wc", {
        state: form.state,
        classCode: form.classCode,
        annualPayroll: parseFloat(form.annualPayroll),
        eMod: parseFloat(form.eMod),
        scheduleRating: parseFloat(form.scheduleRating),
        isPEO,
        dealId: newDeal.id,
      });

      if (isPEO && wfsBreakdown) {
        await api.post("/rate/wfs", {
          annualPayroll: parseFloat(form.annualPayroll),
          headcount: parseInt(form.employeeCount),
          dealId: newDeal.id,
        });
      }

      const slug = form.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
      api.post(`/deals/${newDeal.id}/email`, {
        emailAddress: `${slug}@listener.axel.io`,
        companySlug: slug,
      }).catch(() => {});

      api.post(`/deals/${newDeal.id}/activity`, {
        entityType: "deal",
        entityId: newDeal.id,
        eventType: "DEAL_CREATED",
        description: `Deal created for ${form.businessName} via Marketplace quote`,
      }).catch(() => {});

      setShowSaveDeal(false);
      setToast({ message: `Deal created — ${form.businessName} added to Pipeline`, dealId: newDeal.id });
      setTimeout(() => setToast(null), 6000);
    } catch (err: any) {
      console.error("Failed to save deal:", err);
    } finally {
      setSavingDeal(false);
    }
  };

  const handleRecalculate = () => {
    setWcBreakdown(null);
    setWfsBreakdown(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!vertical || !quoteType) return null;

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

  const errorStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#ef4444",
    marginTop: "4px",
  };

  return (
    <div style={{ maxWidth: "720px" }}>
      <SectionHeader
        title={`New ${quoteType} Quote — ${vertical}`}
        subtitle="Fill in the details below to generate a quote"
      />

      <GlassCard padding="16px 20px" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: textMuted }}>Vertical:</span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: textPrimary }}>{vertical}</span>
          <span style={{ fontSize: "13px", color: textMuted, marginLeft: "16px" }}>Quote Type:</span>
          <span style={{
            fontSize: "12px",
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: "6px",
            background: quoteType === "PEO+WC" ? "rgba(124,58,237,0.15)" : "rgba(30,107,233,0.15)",
            color: quoteType === "PEO+WC" ? "var(--accent-primary)" : "#1E6BE9",
          }}>
            {quoteType}
          </span>
        </div>
      </GlassCard>

      <GlassCard padding="28px">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Business Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              placeholder="Enter business name"
              style={{ ...inputStyle, borderColor: fieldErrors.businessName ? "#ef4444" : inputBorder }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = fieldErrors.businessName ? "#ef4444" : inputBorder)}
            />
            {fieldErrors.businessName && <p style={errorStyle}>{fieldErrors.businessName}</p>}
          </div>

          <div>
            <label style={labelStyle}>State</label>
            <select
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto", borderColor: fieldErrors.state ? "#ef4444" : inputBorder }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = fieldErrors.state ? "#ef4444" : inputBorder)}
            >
              <option value="" style={{ background: isDark ? "#141418" : "#fff" }}>Select state</option>
              {US_STATES.map((s) => (
                <option key={s} value={s} style={{ background: isDark ? "#141418" : "#fff" }}>{s}</option>
              ))}
            </select>
            {fieldErrors.state && <p style={errorStyle}>{fieldErrors.state}</p>}
          </div>

          <div>
            <label style={labelStyle}>Estimated Annual Payroll</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.annualPayroll ? formatCurrency(form.annualPayroll) : ""}
              onChange={(e) => handlePayrollChange(e.target.value)}
              placeholder="$0"
              style={{ ...inputStyle, borderColor: fieldErrors.annualPayroll ? "#ef4444" : inputBorder }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = fieldErrors.annualPayroll ? "#ef4444" : inputBorder)}
            />
            {fieldErrors.annualPayroll && <p style={errorStyle}>{fieldErrors.annualPayroll}</p>}
          </div>

          <div>
            <label style={labelStyle}>Number of Employees</label>
            <input
              type="number"
              value={form.employeeCount}
              onChange={(e) => update("employeeCount", e.target.value)}
              placeholder="0"
              style={{ ...inputStyle, borderColor: fieldErrors.employeeCount ? "#ef4444" : inputBorder }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = fieldErrors.employeeCount ? "#ef4444" : inputBorder)}
            />
            {fieldErrors.employeeCount && <p style={errorStyle}>{fieldErrors.employeeCount}</p>}
          </div>

          <div>
            <label style={labelStyle}>Primary Class Code</label>
            <input
              type="text"
              value={form.classCode}
              onChange={(e) => update("classCode", e.target.value)}
              placeholder="e.g. 8810"
              style={{ ...inputStyle, borderColor: fieldErrors.classCode ? "#ef4444" : inputBorder }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = fieldErrors.classCode ? "#ef4444" : inputBorder)}
            />
            {fieldErrors.classCode && <p style={errorStyle}>{fieldErrors.classCode}</p>}
          </div>

          <div>
            <label style={labelStyle}>EMod</label>
            <input
              type="number"
              step="0.01"
              value={form.eMod}
              onChange={(e) => update("eMod", e.target.value)}
              style={{ ...inputStyle, borderColor: fieldErrors.eMod ? "#ef4444" : inputBorder }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = fieldErrors.eMod ? "#ef4444" : inputBorder)}
            />
            {fieldErrors.eMod && <p style={errorStyle}>{fieldErrors.eMod}</p>}
          </div>

          <div>
            <label style={labelStyle}>Schedule Rating</label>
            <input
              type="number"
              step="0.01"
              value={form.scheduleRating}
              onChange={(e) => update("scheduleRating", e.target.value)}
              style={{ ...inputStyle, borderColor: fieldErrors.scheduleRating ? "#ef4444" : inputBorder }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = fieldErrors.scheduleRating ? "#ef4444" : inputBorder)}
            />
            {fieldErrors.scheduleRating && <p style={errorStyle}>{fieldErrors.scheduleRating}</p>}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
          <PinkButton
            onClick={handleCalculate}
            disabled={calculating}
            style={{ padding: "10px 24px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            {calculating ? (
              <>
                <Loader style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                Calculating...
              </>
            ) : (
              "Calculate Quote"
            )}
          </PinkButton>
          <GhostButton
            onClick={() => navigate("/marketplace")}
            style={{ padding: "10px 24px" }}
          >
            Back to Marketplace
          </GhostButton>
        </div>
      </GlassCard>

      {apiError && (
        <GlassCard padding="16px" style={{ marginTop: "20px", borderColor: "#ef4444" }}>
          <p style={{ fontSize: "14px", color: "#ef4444", margin: 0 }}>
            Rating error: {apiError}
          </p>
        </GlassCard>
      )}

      {wcBreakdown && (
        <div ref={proposalRef} style={{ marginTop: "24px" }}>
          <ProposalPanel
            businessName={form.businessName}
            quoteType={quoteType || "WC Only"}
            wcBreakdown={wcBreakdown}
            wfsBreakdown={wfsBreakdown}
            onSaveDeal={() => setShowSaveDeal(true)}
            onRecalculate={handleRecalculate}
          />
        </div>
      )}

      <Modal isOpen={showSaveDeal} onClose={() => setShowSaveDeal(false)} title="Save as Deal">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", minWidth: "420px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Business Name</label>
            <input type="text" value={form.businessName} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
          </div>
          <div>
            <label style={labelStyle}>Vertical</label>
            <input type="text" value={vertical || ""} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
          </div>
          <div>
            <label style={labelStyle}>Quote Type</label>
            <input type="text" value={quoteType || ""} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input type="text" value={form.state} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
          </div>
          <div>
            <label style={labelStyle}>WC Premium</label>
            <input type="text" value={wcBreakdown ? `$${wcBreakdown.result.wcPremium.toLocaleString()}` : "—"} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <PinkButton
            onClick={handleSaveDeal}
            disabled={savingDeal}
            style={{ padding: "10px 24px" }}
          >
            {savingDeal ? "Creating..." : "Create Deal"}
          </PinkButton>
          <GhostButton onClick={() => setShowSaveDeal(false)} style={{ padding: "10px 24px" }}>
            Cancel
          </GhostButton>
        </div>
      </Modal>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 500,
            background: isDark ? "rgba(14,14,18,0.98)" : "rgba(255,255,255,0.98)",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: "12px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            maxWidth: "420px",
          }}
        >
          <CheckCircle style={{ width: "20px", height: "20px", color: "var(--accent-primary)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: "0 0 6px" }}>{toast.message}</p>
            <GhostButton
              onClick={() => navigate("/pipeline")}
              style={{ padding: "4px 12px", fontSize: "12px" }}
            >
              View in Pipeline
            </GhostButton>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
