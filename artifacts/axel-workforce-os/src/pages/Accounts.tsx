import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GlassCard,
  PinkButton,
  GhostButton,
  Badge,
  SectionHeader,
  Modal,
} from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { Search, Plus, Users, Building2, MapPin, ArrowRight, Mail, Phone } from "lucide-react";

type TabKey = "leads" | "prospects" | "clients";

const CLIENT_STAGES = ["Prospect", "Active Prospect", "New Client", "Active Client"] as const;

const STAGE_COLOR: Record<string, string> = {
  Prospect: "gray",
  "Active Prospect": "purple",
  "New Client": "blue",
  "Active Client": "green",
  Inactive: "gray",
};

const LEAD_STATUSES = ["new", "working", "qualified", "dead"] as const;

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: "New",
  working: "Working",
  qualified: "Qualified",
  converted: "Converted",
  dead: "Dead",
};

const LEAD_STATUS_COLOR: Record<string, string> = {
  new: "blue",
  working: "purple",
  qualified: "green",
  converted: "green",
  dead: "gray",
};

const VERTICALS = ["Cannabis", "Construction", "Staffing", "Healthcare", "Hospitality", "Transportation", "Manufacturing", "Retail"];

interface Account {
  id: string;
  businessName: string;
  vertical?: string;
  state?: string;
  annualPayroll?: string;
  headcount?: number;
  clientStage?: string;
  primaryContact?: string;
  assignedCsa?: string;
}

interface Lead {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  state?: string;
  vertical?: string;
  source?: string;
  status?: string;
  convertedAccountId?: string;
}

interface ConvertedAccount {
  id: string;
  businessName?: string;
  dba?: string;
  fein?: string;
  entityType?: string;
  vertical?: string;
  state?: string;
  primaryContact?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export default function Accounts() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  const isReadOnly = role === "UNDERWRITER";
  const canUseLeads = role === "ADMIN" || role === "CSA" || role === "AGENT";
  const canCreate = !isReadOnly;

  const TABS: { key: TabKey; label: string }[] = [
    ...(canUseLeads ? [{ key: "leads" as TabKey, label: "Leads" }] : []),
    { key: "prospects", label: "Prospects" },
    { key: "clients", label: "Clients" },
  ];

  const [activeTab, setActiveTab] = useState<TabKey>(canUseLeads ? "leads" : "prospects");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [accountForm, setAccountForm] = useState({ businessName: "", vertical: "", state: "", clientStage: "Prospect" });
  const [leadForm, setLeadForm] = useState({ companyName: "", contactName: "", email: "", phone: "", state: "", vertical: "", source: "" });
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);

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
    if (activeTab === "leads") {
      if (!canUseLeads) return;
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      setLeads(await api.get<Lead[]>(`/leads${qs}`));
    } else {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      if (search) params.set("search", search);
      setAccounts(await api.get<Account[]>(`/accounts?${params.toString()}`));
    }
  }, [activeTab, search, canUseLeads]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateAccount = async () => {
    if (!accountForm.businessName) return;
    setSaving(true);
    try {
      await api.post("/accounts", accountForm);
      setShowCreateAccount(false);
      setAccountForm({ businessName: "", vertical: "", state: "", clientStage: "Prospect" });
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLead = async () => {
    if (!leadForm.companyName) return;
    setSaving(true);
    try {
      await api.post("/leads", { ...leadForm, status: "new" });
      setShowCreateLead(false);
      setLeadForm({ companyName: "", contactName: "", email: "", phone: "", state: "", vertical: "", source: "" });
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleLeadStatus = async (lead: Lead, status: string) => {
    await api.patch(`/leads/${lead.id}`, { status });
    fetchData();
  };

  const handleConvert = async (lead: Lead, startSubmission: boolean) => {
    setConverting(lead.id);
    try {
      const res = await api.post<{ account?: ConvertedAccount }>(`/leads/${lead.id}/convert`, { startSubmission });
      if (startSubmission) {
        const account = res?.account;
        const vertical = account?.vertical || lead.vertical;
        if (vertical) {
          const prefill: Record<string, unknown> = {};
          if (account?.businessName) prefill.businessName = account.businessName;
          if (account?.dba) prefill.dba = account.dba;
          if (account?.fein) prefill.fein = account.fein;
          if (account?.entityType) prefill.entityType = account.entityType;
          if (account?.state) {
            prefill.businessState = account.state;
            prefill.primaryState = account.state;
          }
          if (account?.primaryContact) prefill.contactName = account.primaryContact;
          if (account?.contactEmail) prefill.contactEmail = account.contactEmail;
          if (account?.contactPhone) prefill.contactPhone = account.contactPhone;
          navigate("/marketplace/quote/service-type", { state: { vertical, prefill } });
        } else {
          navigate("/marketplace");
        }
      } else {
        await fetchData();
        setActiveTab("prospects");
      }
    } finally {
      setConverting(null);
    }
  };

  const count = activeTab === "leads" ? leads.length : accounts.length;

  return (
    <div>
      <SectionHeader title="Accounts" subtitle={`${count} ${activeTab}`} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${inputBorder}`, marginBottom: "20px" }}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSearch(""); }}
              style={{
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: active ? 600 : 500,
                color: active ? "var(--accent-primary)" : textMuted,
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? "var(--accent-primary)" : "transparent"}`,
                marginBottom: "-1px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 300px", maxWidth: "400px" }}>
          <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: textMuted }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            style={{ ...inputStyle, paddingLeft: "36px" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
          />
        </div>

        {canCreate && activeTab === "leads" && canUseLeads && (
          <PinkButton onClick={() => setShowCreateLead(true)} style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
            <Plus style={{ width: "16px", height: "16px" }} />
            New Lead
          </PinkButton>
        )}
        {canCreate && activeTab !== "leads" && (
          <PinkButton onClick={() => setShowCreateAccount(true)} style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
            <Plus style={{ width: "16px", height: "16px" }} />
            New Account
          </PinkButton>
        )}
      </div>

      {/* Content */}
      {activeTab === "leads" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {leads.map((l) => {
            const isConverted = l.status === "converted" || !!l.convertedAccountId;
            return (
              <GlassCard key={l.id} padding="20px">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>{l.companyName}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                      {l.vertical && (
                        <span style={{ fontSize: "12px", color: textMuted, display: "flex", alignItems: "center", gap: "4px" }}>
                          <Building2 style={{ width: "12px", height: "12px" }} />{l.vertical}
                        </span>
                      )}
                      {l.state && (
                        <span style={{ fontSize: "12px", color: textMuted, display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin style={{ width: "12px", height: "12px" }} />{l.state}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge label={isConverted ? "Converted" : (LEAD_STATUS_LABEL[l.status || "new"] || "New")} color={LEAD_STATUS_COLOR[l.status || "new"] || "gray"} />
                </div>

                {(l.contactName || l.email || l.phone) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                    {l.contactName && <span style={{ fontSize: "13px", color: textPrimary }}>{l.contactName}</span>}
                    {l.email && <span style={{ fontSize: "12px", color: textMuted, display: "flex", alignItems: "center", gap: "5px" }}><Mail style={{ width: "12px", height: "12px" }} />{l.email}</span>}
                    {l.phone && <span style={{ fontSize: "12px", color: textMuted, display: "flex", alignItems: "center", gap: "5px" }}><Phone style={{ width: "12px", height: "12px" }} />{l.phone}</span>}
                  </div>
                )}

                {!isConverted ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      value={l.status || "new"}
                      onChange={(e) => handleLeadStatus(l, e.target.value)}
                      style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: "12px", cursor: "pointer", appearance: "auto" }}
                    >
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
                    </select>
                    <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                      <GhostButton onClick={() => handleConvert(l, false)} disabled={converting === l.id} style={{ padding: "6px 12px", fontSize: "12px" }}>
                        {converting === l.id ? "…" : "Convert"}
                      </GhostButton>
                      <PinkButton onClick={() => handleConvert(l, true)} disabled={converting === l.id} style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                        Convert &amp; Start <ArrowRight style={{ width: "12px", height: "12px" }} />
                      </PinkButton>
                    </div>
                  </div>
                ) : (
                  l.convertedAccountId && (
                    <GhostButton onClick={() => navigate(`/accounts/${l.convertedAccountId}`)} style={{ padding: "6px 12px", fontSize: "12px" }}>
                      View Account
                    </GhostButton>
                  )
                )}
              </GlassCard>
            );
          })}
          {leads.length === 0 && (
            <GlassCard padding="40px" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
              <p style={{ color: textMuted, fontSize: "15px", margin: 0 }}>No leads yet.{canCreate ? " Add your first lead to get started." : ""}</p>
            </GlassCard>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "16px" }}>
          {accounts.map((a) => (
            <GlassCard
              key={a.id}
              padding="20px"
              style={{ cursor: "pointer", transition: "border-color 0.15s" }}
              onClick={() => navigate(`/accounts/${a.id}`)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>{a.businessName}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    {a.vertical && (
                      <span style={{ fontSize: "13px", color: textMuted, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Building2 style={{ width: "12px", height: "12px" }} />
                        {a.vertical}
                      </span>
                    )}
                    {a.state && (
                      <span style={{ fontSize: "13px", color: textMuted, display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin style={{ width: "12px", height: "12px" }} />
                        {a.state}
                      </span>
                    )}
                  </div>
                </div>
                <Badge label={a.clientStage || "Prospect"} color={STAGE_COLOR[a.clientStage || "Prospect"] || "gray"} />
              </div>

              <div style={{ display: "flex", gap: "20px", fontSize: "13px", color: textMuted }}>
                {a.annualPayroll && parseFloat(a.annualPayroll) > 0 && (
                  <span>Payroll: {parseFloat(a.annualPayroll).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}</span>
                )}
                {a.headcount ? <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Users style={{ width: "12px", height: "12px" }} />{a.headcount} employees</span> : null}
              </div>
            </GlassCard>
          ))}
          {accounts.length === 0 && (
            <GlassCard padding="40px" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
              <p style={{ color: textMuted, fontSize: "15px", margin: 0 }}>No {activeTab} found.</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* New Account modal */}
      <Modal isOpen={showCreateAccount} onClose={() => setShowCreateAccount(false)} title="New Account">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: "400px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Business Name *</label>
            <input value={accountForm.businessName} onChange={(e) => setAccountForm(p => ({ ...p, businessName: e.target.value }))} style={inputStyle} placeholder="Enter business name" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Vertical</label>
              <select value={accountForm.vertical} onChange={(e) => setAccountForm(p => ({ ...p, vertical: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
                <option value="">Select</option>
                {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>State</label>
              <input value={accountForm.state} onChange={(e) => setAccountForm(p => ({ ...p, state: e.target.value.toUpperCase() }))} style={inputStyle} placeholder="e.g. FL" maxLength={2} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Stage</label>
            <select value={accountForm.clientStage} onChange={(e) => setAccountForm(p => ({ ...p, clientStage: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
              {CLIENT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <PinkButton onClick={handleCreateAccount} disabled={saving || !accountForm.businessName} style={{ padding: "10px 24px" }}>
              {saving ? "Creating…" : "Create Account"}
            </PinkButton>
            <GhostButton onClick={() => setShowCreateAccount(false)} style={{ padding: "10px 24px" }}>Cancel</GhostButton>
          </div>
        </div>
      </Modal>

      {/* New Lead modal */}
      <Modal isOpen={showCreateLead} onClose={() => setShowCreateLead(false)} title="New Lead">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: "400px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Company Name *</label>
            <input value={leadForm.companyName} onChange={(e) => setLeadForm(p => ({ ...p, companyName: e.target.value }))} style={inputStyle} placeholder="Enter company name" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Contact Name</label>
              <input value={leadForm.contactName} onChange={(e) => setLeadForm(p => ({ ...p, contactName: e.target.value }))} style={inputStyle} placeholder="Full name" />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Email</label>
              <input value={leadForm.email} onChange={(e) => setLeadForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} placeholder="name@company.com" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Phone</label>
              <input value={leadForm.phone} onChange={(e) => setLeadForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} placeholder="(555) 555-5555" />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>State</label>
              <input value={leadForm.state} onChange={(e) => setLeadForm(p => ({ ...p, state: e.target.value.toUpperCase() }))} style={inputStyle} placeholder="e.g. FL" maxLength={2} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Vertical</label>
              <select value={leadForm.vertical} onChange={(e) => setLeadForm(p => ({ ...p, vertical: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
                <option value="">Select</option>
                {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Source</label>
              <input value={leadForm.source} onChange={(e) => setLeadForm(p => ({ ...p, source: e.target.value }))} style={inputStyle} placeholder="e.g. Referral, Web" />
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <PinkButton onClick={handleCreateLead} disabled={saving || !leadForm.companyName} style={{ padding: "10px 24px" }}>
              {saving ? "Creating…" : "Create Lead"}
            </PinkButton>
            <GhostButton onClick={() => setShowCreateLead(false)} style={{ padding: "10px 24px" }}>Cancel</GhostButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
