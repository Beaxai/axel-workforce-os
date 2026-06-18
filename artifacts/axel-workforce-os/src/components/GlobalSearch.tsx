import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { GlassCard, AxelBadge } from "@/components/ui/axel-index";
import { Search, X } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { openDealCard } from "@/components/DealCardModal";

interface SearchResults {
  deals: any[];
  accounts: any[];
  partners: any[];
  resources: any[];
}

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ deals: [], accounts: [], partners: [], resources: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults({ deals: [], accounts: [], partners: [], resources: [] }); return; }
    setLoading(true);
    try {
      const data = await api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch { }
    setLoading(false);
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const totalResults = results.deals.length + results.accounts.length + results.partners.length + results.resources.length;
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  const partnerPath = (p: any) => {
    if (p.partnerType === "Agent") return `/network/agents/${p.id}`;
    if (p.partnerType === "Carrier") return `/network/carriers/${p.id}`;
    if (p.partnerType === "PEO") return `/network/peo/${p.id}`;
    return "/network";
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "80px",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "640px", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px",
          background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.78)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
          borderRadius: "14px 14px 0 0", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        }}>
          <Search style={{ width: 20, height: 20, color: textMuted, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search deals, accounts, partners, resources..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: textPrimary, fontSize: "16px" }}
          />
          <button onClick={onClose} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", padding: "4px" }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: "auto", padding: "12px 20px 20px",
          background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.78)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
          borderTop: "none", borderRadius: "0 0 14px 14px", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        }}>
          {query && totalResults === 0 && !loading && (
            <p style={{ fontSize: "14px", color: textMuted, textAlign: "center", padding: "24px 0" }}>
              No results for "{query}"
            </p>
          )}

          {results.deals.length > 0 && (
            <Section title="Deals">
              {results.deals.map((d) => (
                <ResultRow
                  key={d.id}
                  title={d.businessName || d.referenceCode}
                  subtitle={`${d.referenceCode} · ${d.state || "—"}`}
                  badge={d.stage?.replace(/_/g, " ")}
                  badgeColor="blue"
                  isDark={isDark}
                  onClick={() => { onClose(); openDealCard(d.id); }}
                />
              ))}
            </Section>
          )}

          {results.accounts.length > 0 && (
            <Section title="Accounts">
              {results.accounts.map((a) => (
                <ResultRow
                  key={a.id}
                  title={a.businessName}
                  subtitle={`${a.state || "—"} · ${a.vertical || "—"}`}
                  badge={a.clientStage}
                  badgeColor={a.clientStage?.includes("Client") ? "green" : "yellow"}
                  isDark={isDark}
                  onClick={() => { onClose(); navigate(`/accounts/${a.id}`); }}
                />
              ))}
            </Section>
          )}

          {results.partners.length > 0 && (
            <Section title="Partners">
              {results.partners.map((p) => (
                <ResultRow
                  key={p.id}
                  title={p.name}
                  subtitle={`${p.partnerType} · ${p.agencyName || "—"}`}
                  badge={p.status}
                  badgeColor={p.status === "Active" ? "green" : "yellow"}
                  isDark={isDark}
                  onClick={() => { onClose(); navigate(partnerPath(p)); }}
                />
              ))}
            </Section>
          )}

          {results.resources.length > 0 && (
            <Section title="Resources">
              {results.resources.map((r) => (
                <ResultRow
                  key={r.id}
                  title={r.title}
                  subtitle={r.category}
                  badge={r.resourceType}
                  badgeColor="light-violet"
                  isDark={isDark}
                  onClick={() => { onClose(); window.open(r.fileUrl || "#", "_blank"); }}
                />
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--muted-foreground))", margin: "0 0 8px", padding: "0 4px" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>{children}</div>
    </div>
  );
}

function ResultRow({ title, subtitle, badge, badgeColor, isDark, onClick }: {
  title: string; subtitle: string; badge?: string; badgeColor: string; isDark: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
        padding: "10px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
        background: "transparent", textAlign: "left", transition: "background 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div>
        <p style={{ fontSize: "14px", fontWeight: 500, color: isDark ? "#fff" : "#111", margin: 0 }}>{title}</p>
        <p style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", margin: "2px 0 0" }}>{subtitle}</p>
      </div>
      {badge && <AxelBadge label={badge} color={badgeColor as any} />}
    </button>
  );
}
