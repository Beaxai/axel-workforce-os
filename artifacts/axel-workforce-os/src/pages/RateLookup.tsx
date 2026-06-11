import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, SectionHeader, PinkButton, GhostButton, StatTile } from "@/components/ui/axel-index";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

const inputStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--input-border)",
  background: "var(--input-bg)", color: "var(--input-text)", fontSize: "14px", outline: "none",
};

export default function RateLookup() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const optionStyle: React.CSSProperties = {
    background: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
  };

  const [lookupState, setLookupState] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [filterState, setFilterState] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ["wc-rates-stats"],
    queryFn: () => api.get<{ totalRecords: number; statesCovered: number }>("/wc-rates/stats"),
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ["wc-rates", filterState, filterCode, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filterState) params.set("state", filterState);
      if (filterCode) params.set("classCode", filterCode);
      return api.get<{ data: any[]; page: number; total: number; totalPages: number }>(`/wc-rates?${params}`);
    },
  });

  const handleLookup = async () => {
    if (!lookupState || !lookupCode) return;
    setLookupLoading(true);
    try {
      const result = await api.get<any>(`/wc-rates/lookup?state=${encodeURIComponent(lookupState)}&classCode=${encodeURIComponent(lookupCode)}`);
      setLookupResult(result);
    } catch { setLookupResult({ found: false }); }
    setLookupLoading(false);
  };

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="Rate Table" subtitle="BIC — Benchmark Insurance Company" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <StatTile label="Total Rate Records" value={stats?.totalRecords?.toLocaleString() || "0"} />
        <StatTile label="States Covered" value={String(stats?.statesCovered || 0)} />
      </div>

      <GlassCard style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Rate Lookup</h3>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: "12px", color: textMuted, display: "block", marginBottom: "4px" }}>State</label>
            <select
              value={lookupState}
              onChange={(e) => setLookupState(e.target.value)}
              style={{ ...inputStyle, width: "140px", appearance: "auto" }}
            >
              <option value="" style={optionStyle}>Select...</option>
              {US_STATES.map((s) => <option key={s} value={s} style={optionStyle}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", color: textMuted, display: "block", marginBottom: "4px" }}>Class Code</label>
            <input
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="e.g. 8810"
              style={{ ...inputStyle, width: "200px" }}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          </div>
          <PinkButton onClick={handleLookup} disabled={lookupLoading} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Search style={{ width: 14, height: 14 }} /> Look Up Rate
          </PinkButton>
        </div>

        {lookupResult && (
          <div style={{
            marginTop: "16px", padding: "16px", borderRadius: "10px",
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          }}>
            {lookupResult.found ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px" }}>
                <div>
                  <p style={{ fontSize: "12px", color: textMuted, margin: 0 }}>Class Code</p>
                  <p style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: "4px 0 0" }}>{lookupResult.classCode}</p>
                </div>
                <div>
                  <p style={{ fontSize: "12px", color: textMuted, margin: 0 }}>Description</p>
                  <p style={{ fontSize: "14px", color: textPrimary, margin: "4px 0 0" }}>{lookupResult.description || "—"}</p>
                </div>
                <div>
                  <p style={{ fontSize: "12px", color: textMuted, margin: 0 }}>Base Rate</p>
                  <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-primary)", margin: "4px 0 0" }}>{lookupResult.baseRate}</p>
                </div>
                <div>
                  <p style={{ fontSize: "12px", color: textMuted, margin: 0 }}>Effective Date</p>
                  <p style={{ fontSize: "14px", color: textPrimary, margin: "4px 0 0" }}>{lookupResult.effectiveDate}</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "14px", color: textMuted, margin: 0 }}>
                No rate found for <strong style={{ color: textPrimary }}>{lookupState}</strong> class code <strong style={{ color: textPrimary }}>{lookupCode}</strong>
              </p>
            )}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>Rate Table Browser</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <select
              value={filterState}
              onChange={(e) => { setFilterState(e.target.value); setPage(1); }}
              style={{ ...inputStyle, width: "120px", fontSize: "13px", padding: "8px 10px", appearance: "auto" }}
            >
              <option value="" style={optionStyle}>All States</option>
              {US_STATES.map((s) => <option key={s} value={s} style={optionStyle}>{s}</option>)}
            </select>
            <input
              value={filterCode}
              onChange={(e) => { setFilterCode(e.target.value); setPage(1); }}
              placeholder="Search class code..."
              style={{ ...inputStyle, width: "180px", fontSize: "13px", padding: "8px 10px" }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["State", "Class Code", "Description", "Base Rate", "Effective Date"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 12px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                    fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                    color: textMuted,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: textMuted }}>Loading...</td></tr>
              ) : (tableData?.data || []).length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: textMuted }}>No records found. Import BIC.csv to populate.</td></tr>
              ) : (
                (tableData?.data || []).map((row: any, idx: number) => (
                  <tr key={row.id} style={{
                    background: idx % 2 === 0
                      ? (isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)")
                      : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
                  }}>
                    <td style={{ padding: "10px 12px", color: textPrimary }}>{row.state}</td>
                    <td style={{ padding: "10px 12px", color: textPrimary, fontWeight: 500 }}>{row.classCode}</td>
                    <td style={{ padding: "10px 12px", color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.description || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "var(--accent-primary)", fontWeight: 600 }}>{row.baseRate}</td>
                    <td style={{ padding: "10px 12px", color: textMuted }}>{row.effectiveDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {tableData && tableData.totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", paddingTop: "12px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
            <span style={{ fontSize: "13px", color: textMuted }}>
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, tableData.total)} of {tableData.total.toLocaleString()}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <GhostButton onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} style={{ padding: "6px 10px", fontSize: "13px" }}>
                <ChevronLeft style={{ width: 14, height: 14 }} /> Prev
              </GhostButton>
              <span style={{ fontSize: "13px", color: textPrimary, padding: "6px 12px", display: "flex", alignItems: "center" }}>
                {page} / {tableData.totalPages}
              </span>
              <GhostButton onClick={() => setPage(Math.min(tableData.totalPages, page + 1))} disabled={page >= tableData.totalPages} style={{ padding: "6px 10px", fontSize: "13px" }}>
                Next <ChevronRight style={{ width: 14, height: 14 }} />
              </GhostButton>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
