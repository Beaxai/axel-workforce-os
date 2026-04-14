import { useState, useEffect, useCallback } from "react";
import { SectionHeader, GlassCard, GhostButton } from "@/components/ui/axel-index";
import { useThemeColors } from "@/lib/use-theme-colors";
import { api } from "@/lib/api";
import { AppetiteBadge } from "@/components/AppetiteBadge";
import { Search, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppetiteRow {
  id: number;
  state: string;
  classCode: string;
  description: string | null;
  baseRate: string | null;
  uwDetermination: string;
  uwConsiderations: string | null;
}

const US_STATES = [
  "", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const DETERMINATIONS = ["", "Acceptable", "Referral", "Conditional", "Ineligible"];

export default function AppetiteGuide() {
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();
  const navigate = useNavigate();

  const [rows, setRows] = useState<AppetiteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [detFilter, setDetFilter] = useState("");
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (stateFilter) params.set("state", stateFilter);
      if (detFilter) params.set("determination", detFilter);
      const res = await api.get<{ data: AppetiteRow[]; total: number; page: number }>(`/appetite?${params}`);
      setRows(res.data);
      setTotal(res.total);
    } catch {
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, search, stateFilter, detFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [search, stateFilter, detFilter]);

  const totalPages = Math.ceil(total / limit) || 1;

  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    color: textPrimary,
    fontSize: "13px",
    outline: "none",
  };

  return (
    <div style={{ maxWidth: "1200px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <button
          onClick={() => navigate("/resources")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "transparent",
            border: "none",
            color: textMuted,
            cursor: "pointer",
            fontSize: "13px",
            padding: "6px 10px",
            borderRadius: "6px",
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Resources
        </button>
      </div>
      <SectionHeader
        title="Appetite Guide"
        subtitle={`${total} class code${total !== 1 ? "s" : ""} across all states`}
      />

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "320px" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: textMuted }} />
          <input
            placeholder="Search class code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, width: "100%", paddingLeft: "32px" }}
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: "100px", cursor: "pointer", appearance: "auto" }}
        >
          <option value="">All States</option>
          {US_STATES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={detFilter}
          onChange={(e) => setDetFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: "130px", cursor: "pointer", appearance: "auto" }}
        >
          <option value="">All Determinations</option>
          {DETERMINATIONS.filter(Boolean).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <GlassCard padding="0px">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              {["State", "Class Code", "Description", "Base Rate", "Determination", "Considerations"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontWeight: 600,
                    fontSize: "12px",
                    color: textMuted,
                    borderBottom: `1px solid ${borderColor}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: textMuted }}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: textMuted }}>
                  No appetite data found. Upload an appetite file to populate this table.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  style={{ transition: "background 0.12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "10px 14px", color: textPrimary, fontWeight: 500, borderBottom: `1px solid ${borderColor}` }}>
                    {row.state}
                  </td>
                  <td style={{ padding: "10px 14px", color: textSecondary, fontFamily: "monospace", borderBottom: `1px solid ${borderColor}` }}>
                    {row.classCode}
                  </td>
                  <td style={{ padding: "10px 14px", color: textSecondary, borderBottom: `1px solid ${borderColor}`, maxWidth: "300px" }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.description || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: textSecondary, borderBottom: `1px solid ${borderColor}` }}>
                    {row.baseRate ? `$${parseFloat(row.baseRate).toFixed(2)}` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: `1px solid ${borderColor}` }}>
                    <AppetiteBadge determination={row.uwDetermination} size="sm" />
                  </td>
                  <td style={{ padding: "10px 14px", color: textMuted, fontSize: "12px", borderBottom: `1px solid ${borderColor}`, maxWidth: "240px" }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.uwConsiderations || "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "16px" }}>
          <GhostButton
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{ padding: "6px 12px", fontSize: "13px" }}
            disabled={page <= 0}
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </GhostButton>
          <span style={{ fontSize: "13px", color: textMuted }}>
            Page {page + 1} of {totalPages}
          </span>
          <GhostButton
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            style={{ padding: "6px 12px", fontSize: "13px" }}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight style={{ width: 14, height: 14 }} />
          </GhostButton>
        </div>
      )}
    </div>
  );
}
