import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { GlassCard, SectionHeader, PinkButton, GhostButton, AxelBadge } from "@/components/ui/axel-index";
import { Plus, X, Building2, Shield, Users, Truck, Search, Edit2, Check } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

const TABS = ["Agents", "Carriers", "PEO Partners", "Vendors"] as const;
const TAB_TYPE: Record<string, string> = { Agents: "Agent", Carriers: "Carrier", "PEO Partners": "PEO", Vendors: "Vendor" };
const STATUS_COLORS: Record<string, string> = { Active: "#1EE97B", Pending: "#E9C31E", Suspended: "#E91E1E", Inactive: "#888" };

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--input-border)",
  background: "var(--input-bg)", color: "var(--input-text)", fontSize: "14px", outline: "none",
};

export default function Network() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [tab, setTab] = useState<string>("Agents");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [vendorEdits, setVendorEdits] = useState<any>({});
  const navigate = useNavigate();
  const qc = useQueryClient();

  const partnerType = TAB_TYPE[tab];
  const { data: partners = [] } = useQuery({
    queryKey: ["partners", partnerType],
    queryFn: () => api.get<any[]>(`/partners?type=${partnerType}`),
  });

  const { data: allPartners = [] } = useQuery({
    queryKey: ["partners-all"],
    queryFn: () => api.get<any[]>("/partners"),
  });

  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post("/partners", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["partners"] }); qc.invalidateQueries({ queryKey: ["partners-all"] }); setShowAdd(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/partners/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["partners"] }); setEditingVendor(null); },
  });

  const filtered = partners.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.agencyName || "").toLowerCase().includes(search.toLowerCase())
  );

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  return (
    <div style={{ maxWidth: "1200px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <SectionHeader title="Network" subtitle={`${allPartners.length} total partners`} />
        <PinkButton onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus style={{ width: 16, height: 16 }} /> Add Partner
        </PinkButton>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {filtered.map((p: any) => {
          if (tab === "Vendors") {
            const isEditing = editingVendor === p.id;
            return (
              <GlassCard key={p.id}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <input value={vendorEdits.name || ""} onChange={(e) => setVendorEdits({ ...vendorEdits, name: e.target.value })} style={inputStyle} placeholder="Vendor name" />
                        <input value={vendorEdits.contactName || ""} onChange={(e) => setVendorEdits({ ...vendorEdits, contactName: e.target.value })} style={inputStyle} placeholder="Contact name" />
                        <input value={vendorEdits.contactEmail || ""} onChange={(e) => setVendorEdits({ ...vendorEdits, contactEmail: e.target.value })} style={inputStyle} placeholder="Contact email" />
                        <input value={vendorEdits.notes || ""} onChange={(e) => setVendorEdits({ ...vendorEdits, notes: e.target.value })} style={inputStyle} placeholder="Category" />
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>{p.name}</p>
                        <p style={{ fontSize: "13px", color: textMuted, margin: "4px 0" }}>{(p.metadata as any)?.category || p.notes || "—"}</p>
                        <p style={{ fontSize: "13px", color: textMuted }}>{p.contactName} · {p.contactEmail || "—"}</p>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <AxelBadge label={p.status} color={p.status === "Active" ? "green" : "red"} />
                    {isEditing ? (
                      <GhostButton onClick={() => updateMut.mutate({ id: p.id, data: vendorEdits })} style={{ padding: "4px 8px" }}>
                        <Check style={{ width: 14, height: 14 }} />
                      </GhostButton>
                    ) : (
                      <GhostButton onClick={() => { setEditingVendor(p.id); setVendorEdits({ name: p.name, contactName: p.contactName, contactEmail: p.contactEmail, notes: p.notes }); }} style={{ padding: "4px 8px" }}>
                        <Edit2 style={{ width: 14, height: 14 }} />
                      </GhostButton>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          }

          return (
            <GlassCard
              key={p.id}
              style={{ cursor: "pointer", transition: "border-color 0.15s" }}
              onClick={() => {
                if (tab === "Agents") navigate(`/network/agents/${p.id}`);
                else if (tab === "Carriers") navigate(`/network/carriers/${p.id}`);
                else if (tab === "PEO Partners") navigate(`/network/peo/${p.id}`);
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>{p.name}</p>
                  {tab === "Agents" && (
                    <>
                      <p style={{ fontSize: "13px", color: textMuted, margin: "4px 0" }}>{(p.licenseStates || []).join(", ") || "—"}</p>
                      <p style={{ fontSize: "13px", color: textMuted }}>
                        {deals.filter((d: any) => d.producingAgentId === p.id).length} deals referred ·{" "}
                        ${deals.filter((d: any) => d.producingAgentId === p.id).reduce((s: number, d: any) => s + Number(d.estimatedPremium || 0), 0).toLocaleString()} WC premium
                      </p>
                    </>
                  )}
                  {tab === "Carriers" && (
                    <>
                      <p style={{ fontSize: "13px", color: textMuted, margin: "4px 0" }}>{(p.licenseStates || []).join(", ") || "—"}</p>
                      <p style={{ fontSize: "13px", color: textMuted }}>
                        {policies.filter((pol: any) => pol.carrierId === p.id).length} bound policies ·{" "}
                        ${policies.filter((pol: any) => pol.carrierId === p.id).reduce((s: number, pol: any) => s + Number(pol.premium || 0), 0).toLocaleString()} total premium
                      </p>
                    </>
                  )}
                  {tab === "PEO Partners" && (
                    <>
                      <p style={{ fontSize: "13px", color: textMuted, margin: "4px 0" }}>{(p.metadata as any)?.programName || "—"}</p>
                      <p style={{ fontSize: "13px", color: textMuted }}>{(p.metadata as any)?.verticalsServed || "—"}</p>
                      <p style={{ fontSize: "13px", color: textMuted }}>{(p.metadata as any)?.activeClientCount || 0} active clients</p>
                    </>
                  )}
                </div>
                <AxelBadge
                  label={p.status}
                  color={p.status === "Active" ? "green" : p.status === "Pending" ? "yellow" : "red"}
                />
              </div>
            </GlassCard>
          );
        })}
        {filtered.length === 0 && (
          <GlassCard><p style={{ fontSize: "14px", color: textMuted, textAlign: "center" }}>No {tab.toLowerCase()} found</p></GlassCard>
        )}
      </div>

      {showAdd && <AddPartnerModal partnerType={partnerType} onClose={() => setShowAdd(false)} onSubmit={(data: any) => createMut.mutate(data)} />}
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
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
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
