import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, SectionHeader, GhostButton, AxelBadge } from "@/components/ui/axel-index";
import { ArrowLeft, Edit2, Check, X } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--input-border)",
  background: "var(--input-bg)", color: "var(--input-text)", fontSize: "14px", outline: "none",
};

export default function CarrierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: carrier } = useQuery({
    queryKey: ["partner", id],
    queryFn: () => api.get<any>(`/partners/${id}`),
  });

  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/partners/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["partner", id] }); setEditing(false); },
  });

  if (!carrier) return <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", padding: "40px" }}>Loading...</div>;

  const carrierPolicies = policies.filter((p: any) => p.carrierId === id);
  const meta = (carrier.metadata || {}) as any;

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  const startEdit = () => {
    setForm({
      name: carrier.name, contactName: carrier.contactName, contactEmail: carrier.contactEmail, contactPhone: carrier.contactPhone,
      notes: carrier.notes, metadata: { ...meta },
    });
    setEditing(true);
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      <button onClick={() => navigate("/network")} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", fontSize: "14px" }}>
        <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Network
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: textPrimary, margin: 0 }}>{carrier.name}</h1>
          <AxelBadge label={carrier.status} color={carrier.status === "Active" ? "green" : "red"} />
        </div>
        {editing ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <GhostButton onClick={() => updateMut.mutate({ ...form, metadata: form.metadata })}><Check style={{ width: 14, height: 14 }} /> Save</GhostButton>
            <GhostButton onClick={() => setEditing(false)}><X style={{ width: 14, height: 14 }} /> Cancel</GhostButton>
          </div>
        ) : (
          <GhostButton onClick={startEdit}><Edit2 style={{ width: 14, height: 14 }} /> Edit</GhostButton>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Carrier Info</h3>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Name</label><input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>AM Best Rating</label><input value={form.metadata?.amBestRating || ""} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, amBestRating: e.target.value } })} style={inputStyle} /></div>
              <div><label style={{ fontSize: "12px", color: textMuted }}>Appetite Notes</label><textarea value={form.metadata?.appetiteNotes || ""} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, appetiteNotes: e.target.value } })} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Field label="Name" value={carrier.name} isDark={isDark} />
              <Field label="AM Best Rating" value={meta.amBestRating} isDark={isDark} />
              <Field label="States Active" value={(carrier.licenseStates || []).join(", ")} isDark={isDark} />
              <Field label="Appetite Notes" value={meta.appetiteNotes} isDark={isDark} />
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
              <Field label="Contact Name" value={carrier.contactName} isDark={isDark} />
              <Field label="Email" value={carrier.contactEmail} isDark={isDark} />
              <Field label="Phone" value={carrier.contactPhone} isDark={isDark} />
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Bound Policies ({carrierPolicies.length})</h3>
        {carrierPolicies.length === 0 ? (
          <p style={{ fontSize: "14px", color: textMuted }}>No bound policies with this carrier</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {carrierPolicies.map((p: any) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: 0 }}>{p.policyNumber || "—"}</p>
                  <p style={{ fontSize: "12px", color: textMuted, margin: "2px 0 0" }}>{p.productType || "WC"} · {p.state || "—"}</p>
                </div>
                <span style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>${Number(p.premium || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
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
