import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, SectionHeader, GhostButton, AxelBadge } from "@/components/ui/axel-index";
import { Shield, FileText, Phone, Mail, User } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function MyProgram() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [tab, setTab] = useState("WC");

  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });

  const clientDeals = deals.filter((d: any) => d.stage === "CLIENT" || d.stage === "BOUND");
  const wcDeals = clientDeals.filter((d: any) => d.quoteType === "WC" || d.quoteType === "WC_ONLY");
  const peoDeals = clientDeals.filter((d: any) => d.quoteType === "PEO" || d.quoteType === "BOTH");

  const hasPEO = peoDeals.length > 0;
  const tabs = ["WC"];
  if (hasPEO) tabs.push("PEO");

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";

  return (
    <div style={{ maxWidth: "1000px" }}>
      <SectionHeader title="My Program" />

      {tabs.length > 1 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 500,
              background: tab === t ? "#E91E8C" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              color: tab === t ? "#fff" : textMuted,
            }}>{t === "WC" ? "Workers' Comp" : "PEO Program"}</button>
          ))}
        </div>
      )}

      {tab === "WC" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Shield style={{ width: 20, height: 20, color: "#E91E8C" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>Policy Summary</h3>
            </div>
            {wcDeals.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Field label="Carrier" value="Assigned Carrier" isDark={isDark} />
                <Field label="Policy Number" value="Pending issuance" isDark={isDark} />
                <Field label="Effective Date" value={wcDeals[0]?.effectiveDate || "TBD"} isDark={isDark} />
                <Field label="WC Premium" value={`$${Number(wcDeals[0]?.estimatedPremium || 0).toLocaleString()}`} isDark={isDark} />
                <div><AxelBadge label="Active" color="green" /></div>
              </div>
            ) : (
              <p style={{ fontSize: "14px", color: textMuted }}>No active WC policy</p>
            )}
            <div style={{ marginTop: "16px" }}>
              <GhostButton style={{ fontSize: "13px", padding: "6px 14px" }}>
                <FileText style={{ width: 14, height: 14, marginRight: "6px" }} /> Download Policy Documents
              </GhostButton>
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <User style={{ width: 20, height: 20, color: "#E91E8C" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>Your Team</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Field label="Assigned CSA" value="Axel CSA Team" isDark={isDark} />
              <Field label="Email" value="csa@axelins.com" isDark={isDark} />
              <Field label="Phone" value="(555) 000-0000" isDark={isDark} />
            </div>
          </GlassCard>

          {wcDeals.length > 0 && (
            <GlassCard style={{ gridColumn: "span 2" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Coverage Details</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "12px" }}>
                <Field label="State" value={wcDeals[0]?.state || "—"} isDark={isDark} />
                <Field label="Annual Payroll" value={`$${Number(wcDeals[0]?.annualPayroll || 0).toLocaleString()}`} isDark={isDark} />
                <Field label="Headcount" value={String(wcDeals[0]?.headcount || "—")} isDark={isDark} />
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {tab === "PEO" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <GlassCard>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>PEO Program</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Field label="Program" value="Axel PEO Program" isDark={isDark} />
              <Field label="WC Component" value={`$${Number(peoDeals[0]?.estimatedPremium || 0).toLocaleString()}`} isDark={isDark} />
              <Field label="Monthly Fee" value="See statement" isDark={isDark} />
              <Field label="Headcount" value={String(peoDeals[0]?.headcount || "—")} isDark={isDark} />
              <div><AxelBadge label="Active" color="green" /></div>
            </div>
            <div style={{ marginTop: "16px" }}>
              <GhostButton style={{ fontSize: "13px", padding: "6px 14px" }}>
                <FileText style={{ width: 14, height: 14, marginRight: "6px" }} /> Download Program Documents
              </GhostButton>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>PEO Contact</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Field label="PEO Partner" value="Axel PEO Services" isDark={isDark} />
              <Field label="Contact" value="peo@axelins.com" isDark={isDark} />
              <Field label="Phone" value="(555) 000-0001" isDark={isDark} />
            </div>
          </GlassCard>
        </div>
      )}
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
