import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  GlassCard,
  PinkButton,
  GhostButton,
  Badge,
  SectionHeader,
} from "@/components/ui/axel-index";
import { openDealCard } from "@/components/DealCardModal";
import { useThemeStore } from "@/lib/theme-store";
import { api } from "@/lib/api";
import { ArrowLeft, Clock, User } from "lucide-react";

const CLIENT_STAGES = ["Prospect", "Active Prospect", "New Client", "Active Client"] as const;

const STAGE_COLOR: Record<string, string> = {
  Prospect: "gray",
  "Active Prospect": "purple",
  "New Client": "blue",
  "Active Client": "green",
  Inactive: "gray",
};

const STAGES: Record<string, string> = {
  SUBMISSION_REVIEW: "Submission Review",
  INDICATION: "Indication",
  UW_REVIEW: "U/W Review",
  APPROVED_QUOTED: "Approved / Quoted",
  BIND_ORDER: "Bind Order",
  BOUND: "Bound",
  CLIENT: "Client",
  LOST: "Lost",
};

interface Account {
  id: string;
  businessName: string;
  legalName?: string;
  dba?: string;
  fein?: string;
  entityType?: string;
  naics?: string;
  productType?: string;
  vertical?: string;
  state?: string;
  annualPayroll?: string;
  headcount?: number;
  emod?: string;
  classCodes?: unknown[];
  locations?: unknown[];
  clientStage?: string;
  primaryContact?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

interface Deal {
  id: string;
  businessName?: string;
  referenceCode: string;
  stage?: string;
  productType?: string;
  wcPremium?: string;
}

interface Policy {
  id: string;
  policyNumber?: string;
  policyType?: string;
  status?: string;
  currentPremium?: string;
  effectiveDate?: string;
}

interface ActivityEntry {
  id: string;
  description: string;
  eventType: string;
  createdAt?: string;
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const [account, setAccount] = useState<Account | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ businessName: "", vertical: "", state: "", annualPayroll: "", headcount: "", primaryContact: "", contactEmail: "", contactPhone: "", notes: "", clientStage: "Prospect" });
  const [noteText, setNoteText] = useState("");

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    color: textPrimary,
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  };

  const fetchAccount = useCallback(async () => {
    if (!id) return;
    const a = await api.get<Account>(`/accounts/${id}`);
    setAccount(a);
    setEditForm({
      businessName: a.businessName || "",
      vertical: a.vertical || "",
      state: a.state || "",
      annualPayroll: a.annualPayroll || "",
      headcount: String(a.headcount || ""),
      primaryContact: a.primaryContact || "",
      contactEmail: a.contactEmail || "",
      contactPhone: a.contactPhone || "",
      notes: a.notes || "",
      clientStage: a.clientStage || "Prospect",
    });
  }, [id]);

  const fetchDeals = useCallback(async () => {
    if (!id) return;
    const rows = await api.get<Deal[]>(`/accounts/${id}/deals`);
    setDeals(rows);
  }, [id]);

  const fetchPolicies = useCallback(async () => {
    if (!id) return;
    const rows = await api.get<Policy[]>(`/accounts/${id}/policies`);
    setPolicies(rows);
  }, [id]);

  const fetchActivity = useCallback(async () => {
    if (!id) return;
    const rows = await api.get<ActivityEntry[]>(`/accounts/${id}/activity`);
    setActivity(rows);
  }, [id]);

  useEffect(() => {
    fetchAccount();
    fetchDeals();
    fetchPolicies();
    fetchActivity();
  }, [fetchAccount, fetchDeals, fetchPolicies, fetchActivity]);

  useEffect(() => {
    const handler = () => { fetchDeals(); fetchActivity(); };
    window.addEventListener("deal-updated", handler);
    return () => window.removeEventListener("deal-updated", handler);
  }, [fetchDeals, fetchActivity]);

  const handleSave = async () => {
    if (!id) return;
    await api.patch(`/accounts/${id}`, {
      businessName: editForm.businessName,
      vertical: editForm.vertical || undefined,
      state: editForm.state || undefined,
      annualPayroll: editForm.annualPayroll || undefined,
      headcount: editForm.headcount ? parseInt(editForm.headcount) : undefined,
      primaryContact: editForm.primaryContact || undefined,
      contactEmail: editForm.contactEmail || undefined,
      contactPhone: editForm.contactPhone || undefined,
      notes: editForm.notes || undefined,
      clientStage: editForm.clientStage,
    });
    setEditMode(false);
    fetchAccount();
  };

  const handlePostNote = async () => {
    if (!noteText.trim() || !id) return;
    await api.post(`/accounts/${id}/activity`, {
      description: noteText.trim(),
    });
    setNoteText("");
    fetchActivity();
  };

  if (!account) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: textMuted }}>Loading account...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <GhostButton onClick={() => navigate("/accounts")} style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <ArrowLeft style={{ width: "16px", height: "16px" }} />
          Back
        </GhostButton>
        <SectionHeader title={account.businessName} subtitle={`Account Detail`} />
        <div style={{ marginLeft: "auto" }}>
          <Badge label={account.clientStage || "Prospect"} color={STAGE_COLOR[account.clientStage || "Prospect"] || "gray"} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <GlassCard padding="20px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: 0 }}>Business Info</h3>
              <GhostButton onClick={() => { if (editMode) handleSave(); else setEditMode(true); }} style={{ padding: "4px 12px", fontSize: "12px" }}>
                {editMode ? "Save" : "Edit"}
              </GhostButton>
            </div>
            {editMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <FieldInput label="Business Name" value={editForm.businessName} onChange={(v) => setEditForm(p => ({ ...p, businessName: v }))} inputStyle={inputStyle} isDark={isDark} />
                <FieldInput label="Vertical" value={editForm.vertical} onChange={(v) => setEditForm(p => ({ ...p, vertical: v }))} inputStyle={inputStyle} isDark={isDark} />
                <FieldInput label="State" value={editForm.state} onChange={(v) => setEditForm(p => ({ ...p, state: v }))} inputStyle={inputStyle} isDark={isDark} />
                <FieldInput label="Annual Payroll" value={editForm.annualPayroll} onChange={(v) => setEditForm(p => ({ ...p, annualPayroll: v.replace(/[^0-9.]/g, "") }))} inputStyle={inputStyle} isDark={isDark} />
                <FieldInput label="Headcount" value={editForm.headcount} onChange={(v) => setEditForm(p => ({ ...p, headcount: v.replace(/[^0-9]/g, "") }))} inputStyle={inputStyle} isDark={isDark} />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                <DetailRow label="Legal Name" value={account.legalName} isDark={isDark} />
                <DetailRow label="DBA" value={account.dba} isDark={isDark} />
                <DetailRow label="FEIN" value={account.fein} isDark={isDark} />
                <DetailRow label="Entity Type" value={account.entityType} isDark={isDark} />
                <DetailRow label="Vertical" value={account.vertical} isDark={isDark} />
                <DetailRow label="Product Type" value={account.productType} isDark={isDark} />
                <DetailRow label="NAICS" value={account.naics} isDark={isDark} />
                <DetailRow label="State" value={account.state} isDark={isDark} />
                <DetailRow label="Annual Payroll" value={account.annualPayroll ? parseFloat(account.annualPayroll).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }) : "—"} isDark={isDark} />
                <DetailRow label="Headcount" value={account.headcount ? String(account.headcount) : "—"} isDark={isDark} />
                <DetailRow label="Experience Mod" value={account.emod ? parseFloat(account.emod).toFixed(3) : "—"} isDark={isDark} />
                <DetailRow label="Class Codes" value={account.classCodes?.length ? String(account.classCodes.length) : "—"} isDark={isDark} />
                <DetailRow label="Locations" value={account.locations?.length ? String(account.locations.length) : "—"} isDark={isDark} />
              </div>
            )}
          </GlassCard>

          <GlassCard padding="20px">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: "0 0 14px" }}>Associated Deals</h3>
            {deals.length === 0 && <p style={{ color: textMuted, fontSize: "13px", margin: 0 }}>No deals linked to this account.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {deals.map((d) => (
                <div
                  key={d.id}
                  onClick={() => openDealCard(d.id)}
                  style={{
                    padding: "10px 14px",
                    background: inputBg,
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: `1px solid ${inputBorder}`,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(233,30,140,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = inputBorder; }}
                >
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: textPrimary, margin: 0 }}>{d.businessName || d.referenceCode}</p>
                    <span style={{ fontSize: "11px", color: textMuted }}>{STAGES[d.stage || ""] || d.stage}</span>
                  </div>
                  <Badge label={d.productType === "PEO" ? "PEO" : "WC"} color={d.productType === "PEO" ? "purple" : "blue"} />
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard padding="20px">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: "0 0 14px" }}>Policies</h3>
            {policies.length === 0 && <p style={{ color: textMuted, fontSize: "13px", margin: 0 }}>No policies associated.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {policies.map((p) => (
                <div key={p.id} style={{ padding: "10px 14px", background: inputBg, borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: textPrimary, margin: 0 }}>{p.policyNumber || "—"}</p>
                    <span style={{ fontSize: "11px", color: textMuted }}>{p.policyType} • Effective {p.effectiveDate || "—"}</span>
                  </div>
                  <Badge label={p.status || "Active"} color={p.status === "Active" ? "#22c55e" : "#6b7280"} />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <GlassCard padding="20px">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: "0 0 14px" }}>Contact Info</h3>
            {editMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <FieldInput label="Primary Contact" value={editForm.primaryContact} onChange={(v) => setEditForm(p => ({ ...p, primaryContact: v }))} inputStyle={inputStyle} isDark={isDark} />
                <FieldInput label="Email" value={editForm.contactEmail} onChange={(v) => setEditForm(p => ({ ...p, contactEmail: v }))} inputStyle={inputStyle} isDark={isDark} />
                <FieldInput label="Phone" value={editForm.contactPhone} onChange={(v) => setEditForm(p => ({ ...p, contactPhone: v }))} inputStyle={inputStyle} isDark={isDark} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <DetailRow label="Primary Contact" value={account.primaryContact} isDark={isDark} />
                <DetailRow label="Email" value={account.contactEmail} isDark={isDark} />
                <DetailRow label="Phone" value={account.contactPhone} isDark={isDark} />
              </div>
            )}
          </GlassCard>

          <GlassCard padding="20px">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: "0 0 14px" }}>Account Status</h3>
            {editMode ? (
              <select value={editForm.clientStage} onChange={(e) => setEditForm(p => ({ ...p, clientStage: e.target.value }))} style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
                {CLIENT_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <Badge label={account.clientStage || "Prospect"} color={STAGE_COLOR[account.clientStage || "Prospect"] || "gray"} />
            )}
          </GlassCard>

          <GlassCard padding="20px">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: "0 0 14px" }}>Notes</h3>
            {editMode ? (
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))}
                rows={4}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            ) : (
              <p style={{ fontSize: "13px", color: account.notes ? textPrimary : textMuted, margin: 0, whiteSpace: "pre-wrap" }}>
                {account.notes || "No notes yet."}
              </p>
            )}
          </GlassCard>

          <GlassCard padding="20px">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: "0 0 14px" }}>Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto", marginBottom: "12px" }}>
              {activity.length === 0 && <p style={{ fontSize: "13px", color: textMuted, margin: 0 }}>No activity yet.</p>}
              {activity.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: "10px", padding: "8px 10px", background: inputBg, borderRadius: "8px", alignItems: "flex-start" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: a.eventType === "NOTE" ? "rgba(233,30,140,0.15)" : "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {a.eventType === "NOTE" ? <User style={{ width: "10px", height: "10px", color: "var(--accent-primary)" }} /> : <Clock style={{ width: "10px", height: "10px", color: "#1E6BE9" }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", color: textPrimary, margin: 0 }}>{a.description}</p>
                    <span style={{ fontSize: "10px", color: textMuted }}>{a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handlePostNote(); }}
                placeholder="Add a note..."
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
              />
              <PinkButton onClick={handlePostNote} style={{ padding: "8px 14px", fontSize: "13px" }}>Post</PinkButton>
            </div>
          </GlassCard>
        </div>
      </div>

    </div>
  );
}

function DetailRow({ label, value, isDark }: { label: string; value?: string | null; isDark: boolean }) {
  return (
    <div>
      <span style={{ fontSize: "11px", fontWeight: 500, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>{label}</span>
      <p style={{ fontSize: "13px", color: isDark ? "#fff" : "#111", margin: "2px 0 0" }}>{value || "—"}</p>
    </div>
  );
}

function FieldInput({ label, value, onChange, inputStyle, isDark }: { label: string; value: string; onChange: (v: string) => void; inputStyle: React.CSSProperties; isDark: boolean }) {
  return (
    <div>
      <span style={{ fontSize: "11px", fontWeight: 500, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", display: "block", marginBottom: "4px" }}>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}
