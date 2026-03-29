import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, SectionHeader, GhostButton, AxelBadge, PinkButton } from "@/components/ui/axel-index";
import { ArrowLeft, Edit2, Check, X, UserX } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", outline: "none",
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: agent } = useQuery({
    queryKey: ["partner", id],
    queryFn: () => api.get<any>(`/partners/${id}`),
  });

  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: registrations = [] } = useQuery({ queryKey: ["agent-registrations"], queryFn: () => api.get<any[]>("/agent-registrations") });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/partners/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["partner", id] }); setEditing(false); },
  });

  if (!agent) return <div style={{ color: "rgba(255,255,255,0.5)", padding: "40px" }}>Loading...</div>;

  const agentDeals = deals.filter((d: any) => d.producingAgentId === id);
  const reg = registrations.find((r: any) => r.partnerId === id);

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";

  const startEdit = () => {
    setForm({ name: agent.name, agencyName: agent.agencyName, npn: agent.npn, contactName: agent.contactName, contactEmail: agent.contactEmail, contactPhone: agent.contactPhone, notes: agent.notes });
    setEditing(true);
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      <button onClick={() => navigate("/network")} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", fontSize: "14px" }}>
        <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Network
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: textPrimary, margin: 0 }}>{agent.name}</h1>
          <AxelBadge label={agent.status} color={agent.status === "Active" ? "green" : agent.status === "Pending" ? "yellow" : "red"} />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {editing ? (
            <>
              <GhostButton onClick={() => updateMut.mutate(form)}><Check style={{ width: 14, height: 14 }} /> Save</GhostButton>
              <GhostButton onClick={() => setEditing(false)}><X style={{ width: 14, height: 14 }} /> Cancel</GhostButton>
            </>
          ) : (
            <>
              <GhostButton onClick={startEdit}><Edit2 style={{ width: 14, height: 14 }} /> Edit</GhostButton>
              {agent.status !== "Suspended" && (
                <GhostButton onClick={() => updateMut.mutate({ status: "Suspended" })} style={{ color: "#E91E1E" }}>
                  <UserX style={{ width: 14, height: 14 }} /> Suspend Agent
                </GhostButton>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Profile</h3>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Name</label><input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Agency</label><input value={form.agencyName || ""} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>NPN</label><input value={form.npn || ""} onChange={(e) => setForm({ ...form, npn: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Notes</label><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Field label="Name" value={agent.name} isDark={isDark} />
              <Field label="Agency" value={agent.agencyName} isDark={isDark} />
              <Field label="NPN" value={agent.npn} isDark={isDark} />
              <Field label="License States" value={(agent.licenseStates || []).join(", ")} isDark={isDark} />
              <Field label="Notes" value={agent.notes} isDark={isDark} />
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Contact Info</h3>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Contact Name</label><input value={form.contactName || ""} onChange={(e) => setForm({ ...form, contactName: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Email</label><input value={form.contactEmail || ""} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Phone</label><input value={form.contactPhone || ""} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} style={inputStyle} /></div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Field label="Contact Name" value={agent.contactName} isDark={isDark} />
              <Field label="Email" value={agent.contactEmail} isDark={isDark} />
              <Field label="Phone" value={agent.contactPhone} isDark={isDark} />
            </div>
          )}
        </GlassCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Registration Status</h3>
          {reg ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Field label="Application Submitted" value={reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : "—"} isDark={isDark} />
              <Field label="Agreement Signed" value={reg.agreementSignedAt ? new Date(reg.agreementSignedAt).toLocaleDateString() : "Pending"} isDark={isDark} />
              <Field label="Onboarding Call" value={reg.zoomCompletedAt ? new Date(reg.zoomCompletedAt).toLocaleDateString() : "Pending"} isDark={isDark} />
              <Field label="Credentials Issued" value={reg.status === "ACTIVE" ? "Yes" : "Pending"} isDark={isDark} />
            </div>
          ) : (
            <p style={{ fontSize: "14px", color: textMuted }}>No registration record found</p>
          )}
        </GlassCard>

        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Commission Summary</h3>
          <p style={{ fontSize: "14px", color: textMuted }}>Commission module — coming in a future phase</p>
        </GlassCard>
      </div>

      <div style={{ marginTop: "24px" }}>
        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Associated Deals ({agentDeals.length})</h3>
          {agentDeals.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No deals referred by this agent</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {agentDeals.map((d: any) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: 0 }}>{d.referenceCode}</p>
                    <p style={{ fontSize: "12px", color: textMuted, margin: "2px 0 0" }}>{d.businessName || "—"} · {d.state || "—"}</p>
                  </div>
                  <AxelBadge label={d.stage?.replace(/_/g, " ") || "—"} color="blue" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
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
