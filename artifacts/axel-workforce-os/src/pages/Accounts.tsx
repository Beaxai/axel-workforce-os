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
import { api } from "@/lib/api";
import { Search, Plus, Users, Building2, MapPin } from "lucide-react";

const STATUS_FILTERS = ["All", "Active Client", "Prospect", "Inactive"];

const STATUS_COLORS: Record<string, string> = {
  "Active Client": "#22c55e",
  Prospect: "var(--accent-primary)",
  Inactive: "#6b7280",
};

interface Account {
  id: string;
  businessName: string;
  vertical?: string;
  state?: string;
  annualPayroll?: string;
  headcount?: number;
  accountStatus?: string;
  primaryContact?: string;
  assignedCsa?: string;
}

export default function Accounts() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ businessName: "", vertical: "", state: "", accountStatus: "Prospect" });
  const [saving, setSaving] = useState(false);

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
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

  const fetchAccounts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "All") params.set("status", statusFilter);
    const qs = params.toString();
    const rows = await api.get<Account[]>(`/accounts${qs ? `?${qs}` : ""}`);
    setAccounts(rows);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = async () => {
    if (!form.businessName) return;
    setSaving(true);
    await api.post("/accounts", form);
    setShowCreate(false);
    setForm({ businessName: "", vertical: "", state: "", accountStatus: "Prospect" });
    setSaving(false);
    fetchAccounts();
  };

  return (
    <div>
      <SectionHeader title="Accounts" subtitle={`${accounts.length} total accounts`} />

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 300px", maxWidth: "400px" }}>
          <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: textMuted }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts..."
            style={{ ...inputStyle, paddingLeft: "36px" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
          />
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                border: `1px solid ${statusFilter === f ? "var(--accent-primary)" : inputBorder}`,
                background: statusFilter === f ? "rgba(233,30,140,0.12)" : "transparent",
                color: statusFilter === f ? "var(--accent-primary)" : textMuted,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <PinkButton onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
          <Plus style={{ width: "16px", height: "16px" }} />
          New Account
        </PinkButton>
      </div>

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
              <Badge label={a.accountStatus || "Prospect"} color={STATUS_COLORS[a.accountStatus || "Prospect"] || "#6b7280"} />
            </div>

            <div style={{ display: "flex", gap: "20px", fontSize: "13px", color: textMuted }}>
              {a.annualPayroll && parseFloat(a.annualPayroll) > 0 && (
                <span>Premium: {parseFloat(a.annualPayroll).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}</span>
              )}
              {a.headcount && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Users style={{ width: "12px", height: "12px" }} />{a.headcount} employees</span>}
            </div>
          </GlassCard>
        ))}
        {accounts.length === 0 && (
          <GlassCard padding="40px" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
            <p style={{ color: textMuted, fontSize: "15px", margin: 0 }}>No accounts found. Create your first account to get started.</p>
          </GlassCard>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Account">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: "400px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Business Name *</label>
            <input value={form.businessName} onChange={(e) => setForm(p => ({ ...p, businessName: e.target.value }))} style={inputStyle} placeholder="Enter business name" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Vertical</label>
              <select value={form.vertical} onChange={(e) => setForm(p => ({ ...p, vertical: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
                <option value="">Select</option>
                {["Cannabis", "Construction", "Staffing", "Healthcare", "Hospitality", "Transportation", "Manufacturing", "Retail"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>State</label>
              <input value={form.state} onChange={(e) => setForm(p => ({ ...p, state: e.target.value }))} style={inputStyle} placeholder="e.g. FL" maxLength={2} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: textMuted, display: "block", marginBottom: "4px" }}>Status</label>
            <select value={form.accountStatus} onChange={(e) => setForm(p => ({ ...p, accountStatus: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
              <option value="Prospect">Prospect</option>
              <option value="Active Client">Active Client</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <PinkButton onClick={handleCreate} disabled={saving || !form.businessName} style={{ padding: "10px 24px" }}>
              {saving ? "Creating…" : "Create Account"}
            </PinkButton>
            <GhostButton onClick={() => setShowCreate(false)} style={{ padding: "10px 24px" }}>Cancel</GhostButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
