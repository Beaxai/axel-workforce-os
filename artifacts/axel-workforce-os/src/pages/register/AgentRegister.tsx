import { useThemeColors } from "@/lib/use-theme-colors";
import { useState } from "react";
import { api } from "@/lib/api";
import { PinkButton, GlassCard } from "@/components/ui/axel-index";
import { CheckCircle, ChevronRight } from "lucide-react";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function AgentRegister() {
  const [submitted, setSubmitted] = useState(false);
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${borderColor}`,
    background: cardBg, color: textPrimary, fontSize: "14px", outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = { fontSize: "13px", color: textMuted, marginBottom: "6px", display: "block" };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", agencyName: "", npn: "", licenseStates: [] as string[],
    email: "", phone: "",
  });

  const toggleState = (st: string) => {
    setForm((prev) => ({
      ...prev,
      licenseStates: prev.licenseStates.includes(st) ? prev.licenseStates.filter((s) => s !== st) : [...prev.licenseStates, st],
    }));
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.agencyName || !form.email || !form.phone) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/agent-registrations", {
        firstName: form.firstName, lastName: form.lastName, agencyName: form.agencyName,
        agencyAddress: "TBD", agencyPhone: form.phone, individualNpn: form.npn,
        statesLicensed: form.licenseStates, email: form.email, phone: form.phone,
        eoCarrier: "TBD", eoPolicyNumber: "TBD", eoCoverageAmount: "0", eoExpirationDate: new Date().toISOString().split("T")[0],
        eoCertificateUrl: "TBD", status: "PENDING_REVIEW",
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#060608" : "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: textPrimary, margin: 0 }}>
            <span style={{ color: "var(--accent-primary)" }}>Axel</span> Agent Registration
          </h1>
          <p style={{ fontSize: "15px", color: textMuted, marginTop: "8px" }}>
            Join the Axel Insurance Network
          </p>
        </div>

        {submitted ? (
          <GlassCard>
            <div style={{ textAlign: "center", padding: "24px" }}>
              <CheckCircle style={{ width: 48, height: 48, color: "#1EE97B", marginBottom: "16px" }} />
              <h2 style={{ fontSize: "20px", fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>Application Submitted</h2>
              <p style={{ fontSize: "15px", color: textSecondary, lineHeight: 1.6 }}>
                Your application has been submitted. An Axel team member will review and contact you within 1–2 business days.
              </p>
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: textPrimary, margin: "0 0 20px" }}>Basic Information</h2>
            {error && <p style={{ color: "#E91E1E", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={inputStyle} placeholder="John" />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={inputStyle} placeholder="Smith" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Agency Name *</label>
                <input value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} style={inputStyle} placeholder="Smith Insurance Agency" />
              </div>

              <div>
                <label style={labelStyle}>NPN (National Producer Number)</label>
                <input value={form.npn} onChange={(e) => setForm({ ...form, npn: e.target.value })} style={inputStyle} placeholder="12345678" />
              </div>

              <div>
                <label style={labelStyle}>License States</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxHeight: "120px", overflowY: "auto", padding: "10px", background: cardBg, borderRadius: "8px", border: `1px solid ${borderColor}` }}>
                  {US_STATES.map((st) => (
                    <button key={st} onClick={() => toggleState(st)} type="button" style={{
                      padding: "4px 10px", borderRadius: "4px", fontSize: "12px", border: "none", cursor: "pointer",
                      background: form.licenseStates.includes(st) ? "var(--accent-primary)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                      color: form.licenseStates.includes(st) ? "#fff" : textMuted,
                    }}>{st}</button>
                  ))}
                </div>
                {form.licenseStates.length > 0 && (
                  <p style={{ fontSize: "12px", color: textMuted, marginTop: "4px" }}>Selected: {form.licenseStates.join(", ")}</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Email Address *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="john@smithinsurance.com" />
              </div>

              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} placeholder="(555) 123-4567" />
              </div>

              <PinkButton onClick={handleSubmit} disabled={loading} style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                {loading ? "Submitting..." : "Submit Application"} <ChevronRight style={{ width: 16, height: 16 }} />
              </PinkButton>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
