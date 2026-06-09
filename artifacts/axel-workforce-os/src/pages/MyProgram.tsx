import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, SectionHeader, GhostButton, AxelBadge } from "@/components/ui/axel-index";
import { Shield, FileText, Phone, Mail, User, ClipboardList } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { ASO_BASE_PEPM_RATE } from "@/lib/product-types";

type TabKey = "WC" | "PEO" | "ASO";

export default function MyProgram() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });

  const clientDeals = deals.filter((d: any) => d.stage === "CLIENT" || d.stage === "BOUND");
  const wcDeals = clientDeals.filter((d: any) =>
    d.productType === "WC" || d.productType === "WC_ONLY" || d.quoteType === "WC" || d.quoteType === "WC_ONLY",
  );
  const peoDeals = clientDeals.filter((d: any) =>
    d.productType === "PEO" || d.quoteType === "PEO" || d.quoteType === "BOTH",
  );
  const asoDeals = clientDeals.filter((d: any) => d.productType === "ASO" || d.quoteType === "ASO");

  const hasWC = wcDeals.length > 0;
  const hasPEO = peoDeals.length > 0;
  const hasASO = asoDeals.length > 0;

  const tabs: TabKey[] = [];
  if (hasWC) tabs.push("WC");
  if (hasPEO) tabs.push("PEO");
  if (hasASO) tabs.push("ASO");
  if (tabs.length === 0) tabs.push("WC"); // fallback for empty state

  const [tab, setTab] = useState<TabKey>(tabs[0]);

  // Keep tab valid as async deals load — coerce to first available tab if current is missing
  useEffect(() => {
    if (!tabs.includes(tab)) {
      setTab(tabs[0]);
    }
  }, [hasWC, hasPEO, hasASO]);

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";

  const tabLabel: Record<TabKey, string> = {
    WC: "Workers' Comp",
    PEO: "PEO Program",
    ASO: "Administrative Services (ASO)",
  };

  const asoDeal = asoDeals[0];
  const asoHeadcount = Number(asoDeal?.employeeCountFt || 0);
  const asoMonthly = asoHeadcount * ASO_BASE_PEPM_RATE;
  const asoAnnual = asoMonthly * 12;

  return (
    <div style={{ maxWidth: "1000px" }}>
      <SectionHeader title="My Program" />

      {tabs.length > 1 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 500,
              background: tab === t ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              color: tab === t ? "#fff" : textMuted,
            }}>{tabLabel[t]}</button>
          ))}
        </div>
      )}

      {tab === "WC" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Shield style={{ width: 20, height: 20, color: "var(--accent-primary)" }} />
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
              <User style={{ width: 20, height: 20, color: "var(--accent-primary)" }} />
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

      {tab === "ASO" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <ClipboardList style={{ width: 20, height: 20, color: "var(--accent-primary)" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>Administrative Services Program</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Field label="Program" value="Axel ASO Services" isDark={isDark} />
              <Field label="PEPM Rate" value={`$${ASO_BASE_PEPM_RATE.toFixed(2)}`} isDark={isDark} />
              <Field label="Headcount" value={asoHeadcount ? String(asoHeadcount) : "—"} isDark={isDark} />
              <Field label="Monthly Fee" value={`$${asoMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} isDark={isDark} />
              <Field label="Annual Fee" value={`$${asoAnnual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} isDark={isDark} />
              <div><AxelBadge label="Active" color="green" /></div>
            </div>
            <div style={{ marginTop: "16px" }}>
              <GhostButton style={{ fontSize: "13px", padding: "6px 14px" }}>
                <FileText style={{ width: 14, height: 14, marginRight: "6px" }} /> Download Service Agreement
              </GhostButton>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>What's Included</h3>
            <ul style={{ margin: 0, paddingLeft: 18, color: textPrimary, fontSize: 13, lineHeight: 1.9 }}>
              <li>Full-service payroll &amp; tax filing</li>
              <li>HR administration &amp; compliance</li>
              <li>Benefits administration</li>
              <li>Time &amp; attendance</li>
              <li>Employee handbook &amp; policies</li>
            </ul>
            <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: isDark ? "rgba(233,30,140,0.08)" : "rgba(233,30,140,0.05)", border: `1px solid ${isDark ? "rgba(233,30,140,0.2)" : "rgba(233,30,140,0.15)"}` }}>
              <p style={{ margin: 0, fontSize: 12, color: textMuted }}>
                Note: ASO clients retain their own Workers' Compensation policy. WC is not included in this program.
              </p>
            </div>
          </GlassCard>

          <GlassCard style={{ gridColumn: "span 2" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>ASO Contact</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <Field label="Service Manager" value="Axel ASO Team" isDark={isDark} />
              <Field label="Email" value="aso@axelins.com" isDark={isDark} />
              <Field label="Phone" value="(555) 000-0002" isDark={isDark} />
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
