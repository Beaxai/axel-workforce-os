import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlassCard, PinkButton, GhostButton, SectionHeader, Modal } from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";
import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import WorkforceProfile from "@/components/quote-flow/WorkforceProfile";
import { api } from "@/lib/api";
import { ASO_BASE_PEPM_RATE, PRODUCT_TYPES } from "@/lib/product-types";
import { ClipboardList, Loader, CheckCircle, ArrowLeft } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

interface AsoBreakdown {
  result: { pepm: number; monthlyAsoFee: number; annualAsoFee: number };
  asoBasePepmRate: number;
  ratingBreakdown: Record<string, unknown>;
}

export default function AsoQuote() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { textPrimary, textSecondary, textMuted, borderColor } = useThemeColors();
  const proposalRef = useRef<HTMLDivElement>(null);

  const { vertical } = (location.state as { vertical?: string }) || {};

  const store = useQuoteFlowStore();
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    store.reset();
    store.update({
      vertical: vertical || "Custom",
      coverageType: PRODUCT_TYPES.ASO,
    });
  }, [vertical]);

  const [admin, setAdmin] = useState({
    businessName: "",
    state: "",
    effectiveDate: "",
    headcount: "",
    totalPayroll: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  const [wcRef, setWcRef] = useState({
    currentCarrier: "",
    policyExpiration: "",
    emod: "1.00",
    currentAnnualPremium: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculating, setCalculating] = useState(false);
  const [apiError, setApiError] = useState("");
  const [breakdown, setBreakdown] = useState<AsoBreakdown | null>(null);
  const [showSaveDeal, setShowSaveDeal] = useState(false);
  const [savingDeal, setSavingDeal] = useState(false);
  const [toast, setToast] = useState<{ message: string; dealId: string } | null>(null);

  // Keep workforce profile widget aware of business state
  useEffect(() => {
    if (admin.state) store.update({ businessState: admin.state });
  }, [admin.state]);

  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputStyle = (hasError = false) => ({
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${hasError ? "#ef4444" : borderColor}`,
    background: inputBg,
    color: textPrimary,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  });

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: textSecondary,
    marginBottom: 6,
    fontFamily: "var(--app-font-heading)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!admin.businessName.trim()) e.businessName = "Required";
    if (!admin.state) e.state = "Required";
    if (!admin.effectiveDate) e.effectiveDate = "Required";
    const hc = Number(admin.headcount);
    if (!hc || hc <= 0 || !Number.isInteger(hc)) e.headcount = "Positive integer required";
    const tp = Number(admin.totalPayroll);
    if (!tp || tp <= 0) e.totalPayroll = "Positive number required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCalculate = async () => {
    if (!validate()) return;
    setCalculating(true);
    setApiError("");
    setBreakdown(null);

    try {
      const wfClassCodes: Array<Record<string, unknown>> = [];
      for (const loc of store.locations) {
        for (const cc of loc.classCodes) {
          if (cc.classCode) {
            wfClassCodes.push({
              state: loc.state,
              classCode: cc.classCode,
              description: cc.description,
              annualPayroll: cc.annualPayroll,
              fullTimeEmployees: cc.fullTimeEmployees,
              partTimeEmployees: cc.partTimeEmployees,
            });
          }
        }
      }

      const payload = {
        headcount: Number(admin.headcount),
        state: admin.state,
        effectiveDate: admin.effectiveDate,
        totalPayroll: Number(admin.totalPayroll),
        workforceProfile: {
          locations: store.locations.map((l) => ({
            state: l.state,
            zip: l.zip,
            classCodes: l.classCodes,
          })),
        },
        wcReference: {
          classCodes: wfClassCodes,
          currentCarrier: wcRef.currentCarrier,
          policyExpiration: wcRef.policyExpiration,
          emod: Number(wcRef.emod) || null,
          currentAnnualPremium: wcRef.currentAnnualPremium,
        },
      };

      const res = await api.post<{ success: boolean; data: AsoBreakdown; error?: string }>(
        "/rate/aso",
        payload,
      );
      if (!res.success) throw new Error(res.error || "Calculation failed");
      setBreakdown(res.data);
      setTimeout(() => proposalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err: any) {
      setApiError(err?.message || "Could not calculate ASO quote");
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveAsDeal = async () => {
    if (!breakdown) return;
    setSavingDeal(true);
    try {
      const dealPayload = {
        businessName: admin.businessName,
        vertical: vertical || "Custom",
        productType: PRODUCT_TYPES.ASO,
        state: admin.state,
        annualPayroll: admin.totalPayroll,
        employeeCountFt: Number(admin.headcount),
        contactName: admin.contactName || null,
        contactEmail: admin.contactEmail || null,
        contactPhone: admin.contactPhone || null,
        effectiveDate: admin.effectiveDate,
        wfsPepmRate: String(breakdown.result.pepm),
        stage: "SUBMISSION_REVIEW",
      };
      const newDeal = await api.post<{ id: string; referenceCode?: string }>("/deals", dealPayload);

      // Persist quote with rating breakdown linked to deal
      const wfClassCodes: Array<Record<string, unknown>> = [];
      for (const loc of store.locations) {
        for (const cc of loc.classCodes) {
          if (cc.classCode) {
            wfClassCodes.push({
              state: loc.state,
              classCode: cc.classCode,
              description: cc.description,
              annualPayroll: cc.annualPayroll,
              fullTimeEmployees: cc.fullTimeEmployees,
              partTimeEmployees: cc.partTimeEmployees,
            });
          }
        }
      }
      const persistRes = await api.post<{ success: boolean; error?: string }>("/rate/aso", {
        dealId: newDeal.id,
        headcount: Number(admin.headcount),
        state: admin.state,
        effectiveDate: admin.effectiveDate,
        totalPayroll: Number(admin.totalPayroll),
        workforceProfile: {
          locations: store.locations.map((l) => ({
            state: l.state,
            zip: l.zip,
            classCodes: l.classCodes,
          })),
        },
        wcReference: {
          classCodes: wfClassCodes,
          currentCarrier: wcRef.currentCarrier,
          policyExpiration: wcRef.policyExpiration,
          emod: Number(wcRef.emod) || null,
          currentAnnualPremium: wcRef.currentAnnualPremium,
        },
      });
      if (!persistRes?.success) {
        throw new Error(persistRes?.error || "Failed to persist quote breakdown to deal");
      }

      api.post(`/deals/${newDeal.id}/activity`, {
        entityType: "deal",
        entityId: newDeal.id,
        eventType: "DEAL_CREATED",
        description: `ASO quote saved as deal — $${breakdown.result.monthlyAsoFee.toLocaleString()} monthly`,
      }).catch(() => {});

      setShowSaveDeal(false);
      setToast({ message: "ASO deal saved!", dealId: newDeal.id });
    } catch (err: any) {
      setApiError(err?.message || "Could not save deal");
    } finally {
      setSavingDeal(false);
    }
  };

  const monthly = breakdown?.result.monthlyAsoFee ?? 0;
  const annual = breakdown?.result.annualAsoFee ?? 0;
  const pepm = breakdown?.result.pepm ?? ASO_BASE_PEPM_RATE;

  const accent = "#E91E8C";

  return (
    <div style={{ width: "100%", maxWidth: 1080, margin: "0 auto" }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: textMuted,
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          marginBottom: 16,
        }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} /> Back
      </button>

      <SectionHeader
        title="Get ASO Quote"
        subtitle={`Administrative Services Only — flat $${ASO_BASE_PEPM_RATE.toFixed(2)} PEPM. ${vertical ? `Vertical: ${vertical}` : ""}`}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* SECTION 1 — ADMIN INFO */}
        <GlassCard padding="28px">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <ClipboardList style={{ width: 20, height: 20, color: accent }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: textPrimary, margin: 0 }}>
              Section 1 — Administrative Information
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Business Name</label>
              <input
                type="text"
                value={admin.businessName}
                onChange={(e) => setAdmin((p) => ({ ...p, businessName: e.target.value }))}
                style={inputStyle(!!errors.businessName)}
                placeholder="Acme Corp"
              />
              {errors.businessName && <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>{errors.businessName}</p>}
            </div>

            <div>
              <label style={labelStyle}>Primary State</label>
              <select
                value={admin.state}
                onChange={(e) => setAdmin((p) => ({ ...p, state: e.target.value }))}
                style={inputStyle(!!errors.state)}
              >
                <option value="">Select state...</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>{errors.state}</p>}
            </div>

            <div>
              <label style={labelStyle}>Effective Date</label>
              <input
                type="date"
                value={admin.effectiveDate}
                onChange={(e) => setAdmin((p) => ({ ...p, effectiveDate: e.target.value }))}
                style={inputStyle(!!errors.effectiveDate)}
              />
              {errors.effectiveDate && <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>{errors.effectiveDate}</p>}
            </div>

            <div>
              <label style={labelStyle}>Headcount (W-2 employees)</label>
              <input
                type="number"
                value={admin.headcount}
                onChange={(e) => setAdmin((p) => ({ ...p, headcount: e.target.value }))}
                style={inputStyle(!!errors.headcount)}
                placeholder="e.g. 25"
                min="1"
              />
              {errors.headcount && <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>{errors.headcount}</p>}
            </div>

            <div>
              <label style={labelStyle}>Total Annual Payroll ($)</label>
              <input
                type="number"
                value={admin.totalPayroll}
                onChange={(e) => setAdmin((p) => ({ ...p, totalPayroll: e.target.value }))}
                style={inputStyle(!!errors.totalPayroll)}
                placeholder="e.g. 1500000"
                min="1"
              />
              {errors.totalPayroll && <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>{errors.totalPayroll}</p>}
            </div>

            <div>
              <label style={labelStyle}>Contact Name (optional)</label>
              <input
                type="text"
                value={admin.contactName}
                onChange={(e) => setAdmin((p) => ({ ...p, contactName: e.target.value }))}
                style={inputStyle()}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact Email (optional)</label>
              <input
                type="email"
                value={admin.contactEmail}
                onChange={(e) => setAdmin((p) => ({ ...p, contactEmail: e.target.value }))}
                style={inputStyle()}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact Phone (optional)</label>
              <input
                type="tel"
                value={admin.contactPhone}
                onChange={(e) => setAdmin((p) => ({ ...p, contactPhone: e.target.value }))}
                style={inputStyle()}
              />
            </div>
          </div>
        </GlassCard>

        {/* SECTION 2 — WC REFERENCE */}
        <GlassCard padding="28px">
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: textPrimary, margin: "0 0 6px" }}>
              Section 2 — WC Reference Information
            </h3>
            <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
              ASO clients keep their own Workers' Compensation policy. This information is for reference only and does not affect your ASO pricing.
            </p>
          </div>

          {/* WORKFORCE PROFILE WIDGET */}
          <div style={{ marginBottom: 24 }}>
            <WorkforceProfile />
          </div>

          {/* WC POLICY REFERENCE FIELDS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
            <div>
              <label style={labelStyle}>Current WC Carrier</label>
              <input
                type="text"
                value={wcRef.currentCarrier}
                onChange={(e) => setWcRef((p) => ({ ...p, currentCarrier: e.target.value }))}
                style={inputStyle()}
                placeholder="e.g. Travelers"
              />
            </div>
            <div>
              <label style={labelStyle}>Policy Expiration Date</label>
              <input
                type="date"
                value={wcRef.policyExpiration}
                onChange={(e) => setWcRef((p) => ({ ...p, policyExpiration: e.target.value }))}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle}>Experience Mod (eMod)</label>
              <input
                type="number"
                step="0.01"
                value={wcRef.emod}
                onChange={(e) => setWcRef((p) => ({ ...p, emod: e.target.value }))}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle}>Current Annual WC Premium ($)</label>
              <input
                type="number"
                value={wcRef.currentAnnualPremium}
                onChange={(e) => setWcRef((p) => ({ ...p, currentAnnualPremium: e.target.value }))}
                style={inputStyle()}
                placeholder="e.g. 45000"
              />
            </div>
          </div>
        </GlassCard>

        {/* CALCULATE */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          {apiError && <p style={{ color: "#ef4444", fontSize: 13, margin: 0, alignSelf: "center" }}>{apiError}</p>}
          <PinkButton onClick={handleCalculate} disabled={calculating} style={{ padding: "12px 28px", fontSize: 14 }}>
            {calculating ? <><Loader style={{ width: 14, height: 14, marginRight: 6, animation: "spin 1s linear infinite" }} /> Calculating...</> : "Calculate ASO Quote"}
          </PinkButton>
        </div>

        {/* RESULT */}
        {breakdown && (
          <div ref={proposalRef}>
            <GlassCard padding="32px">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <ClipboardList style={{ width: 22, height: 22, color: accent }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, color: textPrimary, margin: 0 }}>
                  Administrative Services (ASO) Quote
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                <PriceCard label="PEPM Rate" value={`$${pepm.toFixed(2)}`} sub="per employee / month" isDark={isDark} accent={accent} textPrimary={textPrimary} textMuted={textMuted} borderColor={borderColor} />
                <PriceCard label="Monthly ASO Fee" value={`$${monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub={`${admin.headcount} employees × $${pepm.toFixed(2)}`} isDark={isDark} accent={accent} textPrimary={textPrimary} textMuted={textMuted} borderColor={borderColor} />
                <PriceCard label="Annual ASO Fee" value={`$${annual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="monthly × 12" isDark={isDark} accent={accent} textPrimary={textPrimary} textMuted={textMuted} borderColor={borderColor} />
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: isDark ? "rgba(233,30,140,0.06)" : "rgba(233,30,140,0.04)",
                  border: `1px solid ${isDark ? "rgba(233,30,140,0.2)" : "rgba(233,30,140,0.15)"}`,
                  marginBottom: 20,
                }}
              >
                <p style={{ fontSize: 13, color: textSecondary, margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: accent }}>What's included:</strong> Full-service payroll & tax filing, HR administration, benefits administration, time & attendance, employee handbook & policies, compliance support. Client retains their own Workers' Compensation policy.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <GhostButton onClick={() => navigate("/marketplace")} style={{ padding: "10px 20px" }}>
                  Back to Marketplace
                </GhostButton>
                <PinkButton onClick={() => setShowSaveDeal(true)} style={{ padding: "10px 24px" }}>
                  Save as Deal
                </PinkButton>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      <Modal isOpen={showSaveDeal} onClose={() => setShowSaveDeal(false)} title="Save as Deal">
        <div style={{ padding: "8px 4px" }}>
          <p style={{ fontSize: 14, color: textPrimary, margin: "0 0 16px" }}>
            Save this ASO quote as a new deal in your pipeline?
          </p>
          <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: inputBg }}>
            <Row label="Business" value={admin.businessName} textMuted={textMuted} textPrimary={textPrimary} />
            <Row label="Product" value="ASO — Administrative Services" textMuted={textMuted} textPrimary={textPrimary} />
            <Row label="Headcount" value={admin.headcount} textMuted={textMuted} textPrimary={textPrimary} />
            <Row label="Monthly Fee" value={`$${monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} textMuted={textMuted} textPrimary={textPrimary} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <GhostButton onClick={() => setShowSaveDeal(false)} style={{ padding: "8px 18px" }}>Cancel</GhostButton>
            <PinkButton onClick={handleSaveAsDeal} disabled={savingDeal} style={{ padding: "8px 20px" }}>
              {savingDeal ? "Saving..." : "Save Deal"}
            </PinkButton>
          </div>
        </div>
      </Modal>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "16px 20px",
            borderRadius: 12,
            background: isDark ? "rgba(18,18,24,0.95)" : "rgba(255,255,255,0.95)",
            border: `1px solid ${borderColor}`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <CheckCircle style={{ width: 20, height: 20, color: "#22c55e" }} />
          <div>
            <p style={{ margin: 0, fontSize: 14, color: textPrimary, fontWeight: 600 }}>{toast.message}</p>
            <button
              onClick={() => navigate(`/pipeline?deal=${toast.dealId}`)}
              style={{ background: "none", border: "none", color: accent, fontSize: 12, cursor: "pointer", padding: 0, marginTop: 2 }}
            >
              View in pipeline →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceCard({
  label, value, sub, isDark, accent, textPrimary, textMuted, borderColor,
}: { label: string; value: string; sub: string; isDark: boolean; accent: string; textPrimary: string; textMuted: string; borderColor: string }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 14,
        border: `1px solid ${borderColor}`,
        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 11, color: textMuted, margin: "0 0 8px", fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 700, color: accent, margin: "0 0 4px" }}>{value}</p>
      <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{sub}</p>
    </div>
  );
}

function Row({ label, value, textMuted, textPrimary }: { label: string; value: string; textMuted: string; textPrimary: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
      <span style={{ color: textMuted }}>{label}</span>
      <span style={{ color: textPrimary, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
