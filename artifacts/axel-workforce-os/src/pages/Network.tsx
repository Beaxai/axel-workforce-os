import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { GlassCard, SectionHeader, PinkButton, GhostButton, AxelBadge } from "@/components/ui/axel-index";
import { Plus, X, Building2, Shield, Users, Truck, Search, Edit2, Check } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { AgencyGroupCard, OrgGroupCard } from "@/components/ui/NetworkGroups";
import { AddAgentModal } from "@/components/ui/AddAgentModal";

import { useAuthStore } from "@/lib/auth-store";
import { format } from "date-fns";

const BASE_TABS = ["Agents", "Carriers", "PEO Partners", "Vendors"] as const;
const TAB_TYPE: Record<string, string> = { Agents: "Agent", Carriers: "Carrier", "PEO Partners": "PEO", Vendors: "Vendor" };
const STATUS_COLORS: Record<string, string> = { Active: "#1EE97B", Pending: "#E9C31E", Suspended: "#E91E1E", Inactive: "#888" };

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--input-border)",
  background: "var(--input-bg)", color: "var(--input-text)", fontSize: "14px", outline: "none",
};

export default function Network() {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const isDark = theme === "dark";
  const [tab, setTab] = useState<string>("Agents");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddMarket, setShowAddMarket] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const TABS = (user?.role === "ADMIN" || user?.role === "CSA")
    ? [...BASE_TABS, "Markets"]
    : BASE_TABS;

  const partnerType = TAB_TYPE[tab];
  const { data: partners = [] } = useQuery({
    queryKey: ["partners", partnerType],
    queryFn: () => api.get<any[]>(`/partners?type=${partnerType}`),
  });

  const { data: allPartners = [] } = useQuery({
    queryKey: ["partners-all"],
    queryFn: () => api.get<any[]>("/partners"),
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => api.get<any[]>("/agencies"),
  });

  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });

  const { data: marketsResp } = useQuery({
    queryKey: ["markets"],
    queryFn: () => api.get<{ data: any[] }>("/markets"),
    enabled: tab === "Markets" && (user?.role === "ADMIN" || user?.role === "CSA"),
  });
  const markets = marketsResp?.data || [];

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/partners", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["partners"] }); qc.invalidateQueries({ queryKey: ["partners-all"] }); setShowAdd(false); },
  });

  const filtered = partners.filter((p: any) => {
    const term = search.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.firstName && (p.firstName + " " + p.lastName).toLowerCase().includes(term)) ||
      (p.agencyLegalName && p.agencyLegalName.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term)) ||
      (p.contactEmail && p.contactEmail.toLowerCase().includes(term))
    );
  });

  const agencyGroups = useMemo(() => {
    if (tab !== "Agents") return [];

    // Group agents by agencyId
    const groups: Record<string, any[]> = {};
    filtered.forEach((agent: any) => {
      const aid = agent.agencyId || "unassigned";
      if (!groups[aid]) groups[aid] = [];
      groups[aid].push(agent);
    });

    // Also include agencies that match search but have no agents (or maybe not required)
    // Actually, "search agency/name/email and bubble up matching agency"
    // Let's just group the filtered agents. If an agency has no matching agents, but its name matches, we should include it and all its agents?
    // Let's keep it simple: group filtered agents. But if search matches agency name, we should include all its agents.

    const matchedAgencyIds = agencies
      .filter((a: any) => a.legalName?.toLowerCase().includes(search.toLowerCase()))
      .map((a: any) => a.id);

    partners.forEach((agent: any) => {
      const aid = agent.agencyId;
      if (aid && matchedAgencyIds.includes(aid)) {
        if (!groups[aid]) groups[aid] = [];
        if (!groups[aid].find((a: any) => a.id === agent.id)) {
          groups[aid].push(agent);
        }
      }
    });

    const result = Object.entries(groups).map(([aid, agents]) => {
      const agency = agencies.find((a: any) => a.id === aid);
      return {
        agencyId: aid,
        agencyName: agency?.legalName || agents[0]?.agencyLegalName || "Unknown Agency",
        agencyStatus: agency?.status || agents[0]?.agencyStatus || "Active",
        agents
      };
    });

    // Sort by active deal count
    return result.sort((a, b) => {
      const aDeals = deals.filter((d: any) => a.agents.some((ag: any) => ag.userId && ag.userId === d.producingAgentId) && d.stage !== "Closed Won" && d.stage !== "Closed Lost").length;
      const bDeals = deals.filter((d: any) => b.agents.some((ag: any) => ag.userId && ag.userId === d.producingAgentId) && d.stage !== "Closed Won" && d.stage !== "Closed Lost").length;
      return bDeals - aDeals;
    });
  }, [tab, filtered, partners, agencies, search, deals]);

  const filteredMarkets = markets.filter((m: any) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.marketType.toLowerCase().includes(search.toLowerCase())
  );

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <SectionHeader title="Network" subtitle={tab === "Markets" ? `${markets.length} total markets` : tab === "Agents" ? `${agencyGroups.length} total agencies` : `${partners.length} ${tab.toLowerCase()}`} />
        {tab === "Markets" && user?.role === "ADMIN" ? (
          <PinkButton onClick={() => setShowAddMarket(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus style={{ width: 16, height: 16 }} /> Add Market
          </PinkButton>
        ) : tab !== "Markets" ? (
          <PinkButton onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus style={{ width: 16, height: 16 }} /> Add Partner
          </PinkButton>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(""); }}
            style={{
              padding: "8px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 500,
              background: tab === t ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              color: tab === t ? "#fff" : textMuted,
              transition: "all 0.15s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", marginBottom: "20px", maxWidth: "360px" }}>
        <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: textMuted }} />
        <input
          placeholder="Search partners..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: "36px", maxWidth: "360px" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "16px" }}>
        {tab === "Markets" ? (
          <>
            {filteredMarkets.map((m: any) => (
              <GlassCard
                key={m.id}
                style={{ cursor: "pointer", transition: "border-color 0.15s" }}
                onClick={() => navigate(`/network/markets/${m.id}`)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>{m.name}</p>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                      <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", color: textPrimary, fontWeight: 500 }}>
                        {m.marketType === "WC_CARRIER" ? "WC Carrier" : "PEO Program"}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: m.isAppointed ? "rgba(30,233,123,0.1)" : "rgba(233,30,30,0.1)", color: m.isAppointed ? "#1EE97B" : "#E91E1E", fontWeight: 500 }}>
                        {m.isAppointed ? "Appointed" : "Not Appointed"}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: textMuted, marginTop: "8px", marginBottom: 0 }}>
                      Effective: {m.effectiveDate ? format(new Date(m.effectiveDate), "MMM d, yyyy") : "TBD"}
                    </p>
                  </div>
                  <AxelBadge
                    label={m.isActive ? "Active" : "Inactive"}
                    color={m.isActive ? "green" : "gray"}
                  />
                </div>
              </GlassCard>
            ))}
            {filteredMarkets.length === 0 && (
              <GlassCard><p style={{ fontSize: "14px", color: textMuted, textAlign: "center", margin: 0 }}>No markets found</p></GlassCard>
            )}
          </>
        ) : tab === "Agents" ? (
          <>
            {agencyGroups.map(group => (
              <AgencyGroupCard
                key={group.agencyId}
                agencyId={group.agencyId}
                agencyName={group.agencyName}
                agencyStatus={group.agencyStatus}
                agents={group.agents}
                deals={deals}
              />
            ))}
            {agencyGroups.length === 0 && (
              <GlassCard><p style={{ fontSize: "14px", color: textMuted, textAlign: "center", margin: 0 }}>No agencies found</p></GlassCard>
            )}
          </>
        ) : (
          <>
            {filtered.map((p: any) => (
              <OrgGroupCard key={p.id} org={p} type={tab} />
            ))}
            {filtered.length === 0 && (
              <GlassCard><p style={{ fontSize: "14px", color: textMuted, textAlign: "center", margin: 0 }}>No {tab.toLowerCase()} found</p></GlassCard>
            )}
          </>
        )}
      </div>

      {showAdd && partnerType === "Agent" ? (
        <AddAgentModal onClose={() => setShowAdd(false)} />
      ) : showAdd ? (
        <AddPartnerModal partnerType={partnerType} onClose={() => setShowAdd(false)} onSubmit={(data: any) => createMut.mutate(data)} />
      ) : null}
      {showAddMarket && <AddMarketModal onClose={() => setShowAddMarket(false)} />}
    </div>
  );
}

function AddPartnerModal({ partnerType, onClose, onSubmit }: { partnerType: string; onClose: () => void; onSubmit: (data: any) => void }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [form, setForm] = useState<any>({ partnerType, name: "", agencyName: "", contactName: "", contactEmail: "", contactPhone: "", npn: "", licenseStates: [], notes: "", status: "Active", metadata: {} });
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [programName, setProgramName] = useState("");
  const [verticalsServed, setVerticalsServed] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = () => {
    const metadata: any = {};
    if (partnerType === "PEO") { metadata.programName = programName; metadata.verticalsServed = verticalsServed; metadata.activeClientCount = 0; metadata.wcBundledDiscount = 10; }
    if (partnerType === "Vendor") { metadata.category = category; }
    onSubmit({ ...form, licenseStates: selectedStates, metadata });
  };

  const toggleState = (st: string) => setSelectedStates((prev) => prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-bg)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "520px", maxHeight: "85vh", overflowY: "auto", background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, borderRadius: "16px", padding: "32px", boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: isDark ? "#fff" : "#111", margin: 0 }}>Add {partnerType}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", cursor: "pointer" }}><X style={{ width: 20, height: 20 }} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </div>
          {(partnerType === "Agent") && (
            <div>
              <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Agency Name</label>
              <input value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} style={inputStyle} />
            </div>
          )}
          {(partnerType === "Agent") && (
            <div>
              <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>NPN</label>
              <input value={form.npn} onChange={(e) => setForm({ ...form, npn: e.target.value })} style={inputStyle} />
            </div>
          )}
          {(partnerType === "Agent" || partnerType === "Carrier") && (
            <div>
              <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>License States</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxHeight: "120px", overflowY: "auto", padding: "8px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--input-border)" }}>
                {US_STATES.map((st) => (
                  <button key={st} onClick={() => toggleState(st)} style={{
                    padding: "4px 8px", borderRadius: "4px", fontSize: "12px", border: "none", cursor: "pointer",
                    background: selectedStates.includes(st) ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    color: selectedStates.includes(st) ? "#fff" : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)",
                  }}>{st}</button>
                ))}
              </div>
            </div>
          )}
          {partnerType === "PEO" && (
            <>
              <div>
                <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Program Name</label>
                <input value={programName} onChange={(e) => setProgramName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Verticals Served</label>
                <input value={verticalsServed} onChange={(e) => setVerticalsServed(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}
          {partnerType === "Vendor" && (
            <div>
              <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} />
            </div>
          )}
          <div>
            <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Contact Name</label>
            <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Contact Email</label>
            <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Contact Phone</label>
            <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          <PinkButton onClick={handleSubmit} style={{ marginTop: "8px" }}>Add {partnerType}</PinkButton>
        </div>
      </div>
    </div>
  );
}

function AddMarketModal({ onClose }: { onClose: () => void }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", marketType: "WC_CARRIER", productLane: "WC" });

  const createMarket = useMutation({
    mutationFn: (data: any) => api.post("/markets", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["markets"] }); onClose(); },
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-bg)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, borderRadius: "16px", padding: "32px", boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: isDark ? "#fff" : "#111", margin: 0 }}>Add Market</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", cursor: "pointer" }}><X style={{ width: 20, height: 20 }} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Market Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Travelers WC, AmTrust PEO" />
          </div>

          <div>
            <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Market Type</label>
            <select
              value={form.marketType}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, marketType: val, productLane: val === "WC_CARRIER" ? "WC" : "PEO" });
              }}
              style={inputStyle}
            >
              <option value="WC_CARRIER">Workers Comp Carrier</option>
              <option value="PEO_PROGRAM">PEO Program</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block" }}>Product Lane</label>
            <select value={form.productLane} disabled style={{ ...inputStyle, opacity: 0.7 }}>
              <option value="WC">WC</option>
              <option value="PEO">PEO</option>
            </select>
          </div>

          <PinkButton onClick={() => createMarket.mutate(form)} disabled={!form.name.trim() || createMarket.isPending} style={{ marginTop: "8px" }}>
            {createMarket.isPending ? "Creating..." : "Create Market"}
          </PinkButton>
        </div>
      </div>
    </div>
  );
}
