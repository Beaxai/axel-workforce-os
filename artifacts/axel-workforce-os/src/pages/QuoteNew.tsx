import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SectionHeader, GlassCard, PinkButton, GhostButton } from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";

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

export default function QuoteNew() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const { vertical, quoteType } = (location.state as { vertical?: string; quoteType?: string }) || {};

  useEffect(() => {
    if (!vertical || !quoteType) {
      navigate("/marketplace", { replace: true });
    }
  }, [vertical, quoteType, navigate]);

  const [form, setForm] = useState<QuoteForm>({
    businessName: "",
    state: "",
    annualPayroll: "",
    employeeCount: "",
    classCode: "",
    eMod: "1.0",
    scheduleRating: "1.0",
  });

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const update = (field: keyof QuoteForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  const handleCalculate = () => {
    console.log("Quote form state:", { vertical, quoteType, ...form });
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
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: textMuted,
    marginBottom: "6px",
  };

  return (
    <div style={{ maxWidth: "720px" }}>
      <SectionHeader
        title={`New ${quoteType} Quote — ${vertical}`}
        subtitle="Fill in the details below to generate a quote"
      />

      <GlassCard padding="28px">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Business Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              placeholder="Enter business name"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#E91E8C")}
              onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>State</label>
            <select
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#E91E8C")}
              onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
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
              value={form.annualPayroll ? formatCurrency(form.annualPayroll) : ""}
              onChange={(e) => handlePayrollChange(e.target.value)}
              placeholder="$0"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#E91E8C")}
              onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>Number of Employees</label>
            <input
              type="number"
              value={form.employeeCount}
              onChange={(e) => update("employeeCount", e.target.value)}
              placeholder="0"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#E91E8C")}
              onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>Primary Class Code</label>
            <input
              type="text"
              value={form.classCode}
              onChange={(e) => update("classCode", e.target.value)}
              placeholder="e.g. 8810"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#E91E8C")}
              onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>EMod</label>
            <input
              type="number"
              step="0.01"
              value={form.eMod}
              onChange={(e) => update("eMod", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#E91E8C")}
              onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
            />
          </div>

          <div>
            <label style={labelStyle}>Schedule Rating</label>
            <input
              type="number"
              step="0.01"
              value={form.scheduleRating}
              onChange={(e) => update("scheduleRating", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#E91E8C")}
              onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
          <PinkButton
            onClick={handleCalculate}
            style={{ padding: "10px 24px" }}
          >
            Calculate Quote
          </PinkButton>
          <GhostButton
            onClick={() => navigate("/marketplace")}
            style={{ padding: "10px 24px" }}
          >
            Back to Marketplace
          </GhostButton>
        </div>
      </GlassCard>
    </div>
  );
}
