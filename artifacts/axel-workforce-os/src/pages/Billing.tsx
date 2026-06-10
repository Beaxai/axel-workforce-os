import { useState, useEffect, useCallback } from "react";
import {
  GlassCard,
  GhostButton,
  Badge,
  StatTile,
  SectionHeader,
} from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";
import { api } from "@/lib/api";
import { Search, Download } from "lucide-react";

interface Policy {
  id: string;
  dealId?: string;
  policyNumber?: string;
  policyType?: string;
  status?: string;
  currentPremium?: string;
  estimatedPremium?: string;
  effectiveDate?: string;
  expirationDate?: string;
  wfsPepmRate?: string;
}

interface Deal {
  id: string;
  businessName?: string;
  state?: string;
  employeeCountFt?: number;
  productType?: string;
  wcPremium?: string;
  wfsPepmRate?: string;
  wfsPepmMonthly?: string;
  wfsPepmAnnual?: string;
  stage?: string;
}

export default function Billing() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tab, setTab] = useState<"wc" | "wfs">("wc");
  const [search, setSearch] = useState("");

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    color: textPrimary,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const fetchData = useCallback(async () => {
    const [pols, dls] = await Promise.all([
      api.get<Policy[]>("/policies"),
      api.get<Deal[]>("/deals"),
    ]);
    setPolicies(pols);
    setDeals(dls);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const boundDeals = deals.filter((d) => d.stage === "BOUND" || d.stage === "CLIENT");

  const filteredPolicies = policies.filter((p) => {
    if (!search) return true;
    const deal = deals.find((d) => d.id === p.dealId);
    return deal?.businessName?.toLowerCase().includes(search.toLowerCase()) || p.policyNumber?.toLowerCase().includes(search.toLowerCase());
  });

  const peoDeals = boundDeals.filter((d) => d.productType === "PEO").filter((d) => {
    if (!search) return true;
    return d.businessName?.toLowerCase().includes(search.toLowerCase());
  });

  const totalPremium = filteredPolicies.reduce((sum, p) => sum + parseFloat(p.currentPremium || p.estimatedPremium || "0"), 0);
  const avgPremium = filteredPolicies.length > 0 ? totalPremium / filteredPolicies.length : 0;

  const totalMonthlyWfs = peoDeals.reduce((sum, d) => sum + parseFloat(d.wfsPepmMonthly || "0"), 0);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  const handleExportCSV = () => {
    let csv = "";
    if (tab === "wc") {
      csv = "Business Name,State,Policy Number,WC Premium,Effective Date,Status\n";
      filteredPolicies.forEach((p) => {
        const deal = deals.find((d) => d.id === p.dealId);
        csv += `"${deal?.businessName || ""}","${deal?.state || ""}","${p.policyNumber || ""}","${p.currentPremium || p.estimatedPremium || ""}","${p.effectiveDate || ""}","${p.status || ""}"\n`;
      });
    } else {
      csv = "Business Name,Headcount,Monthly WFS,Annual WFS,PEPM Rate\n";
      peoDeals.forEach((d) => {
        csv += `"${d.businessName || ""}","${d.employeeCountFt || ""}","${d.wfsPepmMonthly || ""}","${d.wfsPepmAnnual || ""}","${d.wfsPepmRate || ""}"\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <SectionHeader title="Billing" subtitle={`${fmt(totalPremium)} total active premium under management`} />

      <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
        {(["wc", "wfs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(""); }}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              border: `1px solid ${tab === t ? "var(--accent-primary)" : inputBorder}`,
              background: tab === t ? "rgba(233,30,140,0.12)" : "transparent",
              color: tab === t ? "var(--accent-primary)" : textMuted,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t === "wc" ? "WC Premiums" : "Workforce Solutions Fees"}
          </button>
        ))}
      </div>

      {/* STAT TILES */}
      {tab === "wc" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <StatTile label="Total Premium" value={fmt(totalPremium)} />
          <StatTile label="Total Policies" value={String(filteredPolicies.length)} />
          <StatTile label="Avg Premium" value={fmt(avgPremium)} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <StatTile label="Total Monthly WFS Fees" value={fmt(totalMonthlyWfs)} />
          <StatTile label="Total Active PEO Clients" value={String(peoDeals.length)} />
        </div>
      )}

      {/* SEARCH + EXPORT */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 300px", maxWidth: "400px" }}>
          <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: textMuted }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by business name..."
            style={{ ...inputStyle, paddingLeft: "36px" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
          />
        </div>
        <GhostButton onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
          <Download style={{ width: "14px", height: "14px" }} />
          Export CSV
        </GhostButton>
      </div>

      {/* CONTENT */}
      {tab === "wc" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredPolicies.length === 0 && (
            <GlassCard padding="40px" style={{ textAlign: "center" }}>
              <p style={{ color: textMuted, fontSize: "15px", margin: 0 }}>No policies found.</p>
            </GlassCard>
          )}
          {filteredPolicies.map((p) => {
            const deal = deals.find((d) => d.id === p.dealId);
            return (
              <GlassCard key={p.id} padding="16px">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>
                      {deal?.businessName || p.policyNumber || "Unknown"}
                    </h4>
                    <span style={{ fontSize: "12px", color: textMuted }}>
                      {deal?.state ? `${deal.state} • ` : ""}{p.policyNumber || "No policy #"} • Effective: {p.effectiveDate || "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: textPrimary }}>
                      {fmt(parseFloat(p.currentPremium || p.estimatedPremium || "0"))}
                    </span>
                    <Badge label={p.status || "Active"} color={p.status === "Active" ? "#22c55e" : p.status === "Cancelled" ? "#ef4444" : "#6b7280"} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {peoDeals.length === 0 && (
            <GlassCard padding="40px" style={{ textAlign: "center" }}>
              <p style={{ color: textMuted, fontSize: "15px", margin: 0 }}>No active PEO clients found.</p>
            </GlassCard>
          )}
          {peoDeals.map((d) => (
            <GlassCard key={d.id} padding="16px">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>{d.businessName || "Unknown"}</h4>
                  <span style={{ fontSize: "12px", color: textMuted }}>{d.employeeCountFt || 0} employees</span>
                </div>
                <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", color: textMuted, display: "block" }}>Monthly</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: textPrimary }}>{fmt(parseFloat(d.wfsPepmMonthly || "0"))}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", color: textMuted, display: "block" }}>Annual</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: textPrimary }}>{fmt(parseFloat(d.wfsPepmAnnual || "0"))}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", color: textMuted, display: "block" }}>PEPM</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-primary)" }}>{fmt(parseFloat(d.wfsPepmRate || "0"))}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
