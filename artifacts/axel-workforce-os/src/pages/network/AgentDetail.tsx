import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, GhostButton, AxelBadge, PinkButton, Modal } from "@/components/ui/axel-index";
import { ArrowLeft, Edit2, MoreHorizontal, Mail, Phone } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { openDealCard } from "@/components/DealCardModal";
import { displayName as getAgentDisplayName } from "@/lib/agent-display-name";
import { dealDisplayName } from "@/lib/deal-display-name";
import { useAuthStore } from "@/lib/auth-store";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--input-border)",
  background: "var(--input-bg)", color: "var(--input-text)", fontSize: "14px", outline: "none",
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const qc = useQueryClient();
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");
  const [editing, setEditing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"Suspend" | "Terminate" | null>(null);
  const [form, setForm] = useState<any>({});

  const { data: agent, isLoading } = useQuery({
    queryKey: ["partner", id],
    queryFn: () => api.get<any>(`/partners/${id}`),
  });
  const { data: allDeals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: () => api.get<any[]>("/deals"),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) =>
      api.patch(`/partners/${id}/agent-profile`, {
        ...data,
        lastName: data.lastName || null,
        title: data.title || null,
        email: data.email || null,
        phoneDirect: data.phoneDirect || null,
        phoneMobile: data.phoneMobile || null,
        individualNpn: data.individualNpn || null,
        licenseStates: String(data.licenseStates || "")
          .split(",")
          .map((state) => state.trim().toUpperCase())
          .filter(Boolean),
        notes: data.notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner", id] });
      setEditing(false);
    },
  });

  const statusMut = useMutation({
    mutationFn: (status: "Suspended" | "Terminated") => api.patch(`/partners/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner", id] });
      setConfirmAction(null);
    },
  });

  if (isLoading || !agent) return <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", padding: "40px" }}>Loading...</div>;

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  const startEdit = () => {
    setForm({
      firstName: agent.firstName || "",
      lastName: agent.lastName || "",
      title: agent.title || "",
      email: agent.email || agent.contactEmail || "",
      phoneDirect: agent.phoneDirect || agent.contactPhone || "",
      phoneMobile: agent.phoneMobile || "",
      individualNpn: agent.individualNpn || agent.npn || "",
      licenseStates: (agent.agentLicenseStates || agent.licenseStates || []).join(", "),
      notes: agent.notes
    });
    setEditing(true);
  };

  const agentName = getAgentDisplayName(agent);
  const initials = agentName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarStyle = {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "rgba(124,58,237,0.18)",
    color: "#AFA9EC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: 600,
    flexShrink: 0,
  };

  const secondarySegments = [];
  if (agent.title) secondarySegments.push(<span key="title">{agent.title}</span>);
  if (agent.agencyLegalName || agent.agencyName) {
    secondarySegments.push(
      <button
        key="agency"
        onClick={() => navigate("/network")}
        style={{ background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", fontSize: "inherit" }}
        className="hover:text-primary transition-colors"
      >
        {agent.agencyLegalName || agent.agencyName}
      </button>
    );
  }

  const joinedSecondary = secondarySegments.map((seg, i) => (
    <span key={`seg-${i}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {seg}
      {i < secondarySegments.length - 1 && <span style={{ color: textMuted }}>·</span>}
    </span>
  ));

  const email = agent.email || agent.contactEmail;
  const phoneDirect = agent.phoneDirect || agent.contactPhone;
  const phoneMobile = agent.phoneMobile;
  const hasContact = email || phoneDirect || phoneMobile;

  const associatedDeals = allDeals.filter((deal: any) => deal.producingAgentId === agent.userId);
  const backAgencyName = agent.agencyLegalName || agent.agencyName;
  const backLabel = backAgencyName ? `Back to ${backAgencyName}` : "Back to Network";

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", paddingBottom: "60px" }}>
      <button
        onClick={() => navigate(backAgencyName && agent.agencyId ? `/network/agencies/${agent.agencyId}` : "/network")}
        style={{
          background: "none",
          border: "none",
          color: textMuted,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "24px",
          fontSize: "13px",
          padding: 0,
          fontWeight: 500
        }}
        className="hover:text-primary transition-colors"
      >
        <ArrowLeft style={{ width: 14, height: 14 }} /> {backLabel}
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={avatarStyle}>{initials}</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: textPrimary, margin: 0, letterSpacing: "-0.01em" }}>
                {agentName}
              </h1>
              <AxelBadge label={agent.status || "Active"} color={agent.status === "Active" ? "green" : agent.status === "Pending" ? "yellow" : "red"} />
            </div>
            {secondarySegments.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: textMuted, flexWrap: "wrap" }}>
                {joinedSecondary}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <PinkButton onClick={startEdit} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#E91E8C" }}>
            <Edit2 style={{ width: 14, height: 14 }} /> Edit
          </PinkButton>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <GhostButton style={{ padding: "8px 12px" }}>
                  <MoreHorizontal style={{ width: 16, height: 16 }} />
                </GhostButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ width: "160px" }}>
                {agent.status !== "Suspended" && agent.status !== "Terminated" && (
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-600 focus:bg-red-500/10 cursor-pointer font-medium"
                    onSelect={() => setConfirmAction("Suspend")}
                  >
                    Suspend Agent
                  </DropdownMenuItem>
                )}
                {agent.status !== "Terminated" && (
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-600 focus:bg-red-500/10 cursor-pointer font-medium"
                    onSelect={() => setConfirmAction("Terminate")}
                  >
                    Terminate Agent
                  </DropdownMenuItem>
                )}
                {agent.status === "Terminated" && (
                  <DropdownMenuItem
                    className="cursor-default text-muted-foreground"
                    disabled
                  >
                    Agent Terminated
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "32px" }}>
        {[
          { label: "WC deals", val: (agent.productionMetrics?.wcDeals || 0) },
          { label: "WC premium", val: `$${((agent.productionMetrics?.wcPremium || 0)).toLocaleString()}` },
          { label: "PEO deals", val: (agent.productionMetrics?.peoDeals || 0) },
          { label: "PEO premium", val: `$${((agent.productionMetrics?.peoPremium || 0)).toLocaleString()}` },
          { label: "ASO deals", val: (agent.productionMetrics?.asoDeals || 0) },
          { label: "ASO fees", val: `$${((agent.productionMetrics?.asoFees || 0)).toLocaleString()}` },
        ].map(stat => (
          <GlassCard key={stat.label} padding="16px">
            <p style={{ fontSize: "11px", color: textMuted, marginBottom: "8px", fontWeight: 500 }}>{stat.label}</p>
            <p style={{ fontSize: "20px", color: textPrimary, margin: 0, fontWeight: 600 }}>{stat.val}</p>
          </GlassCard>
        ))}
      </div>

      <div style={{ marginBottom: "32px" }}>
        {hasContact && (
          <GlassCard padding="24px">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "20px" }}>Contact</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {email && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                   <Mail style={{ width: 15, height: 15, color: textMuted }} />
                    <a href={`mailto:${email}`} style={{ color: "#E91E8C", fontSize: "14px", textDecoration: "none" }} className="hover:underline">{email}</a>
                </div>
              )}
              {phoneDirect && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                   <Phone style={{ width: 15, height: 15, color: textMuted }} />
                    <a href={`tel:${phoneDirect}`} style={{ color: textPrimary, fontSize: "14px", textDecoration: "none" }} className="hover:underline">{phoneDirect}</a>
                   <span style={{ color: textMuted, fontSize: "12px" }}>Direct</span>
                </div>
              )}
              {phoneMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                   <Phone style={{ width: 15, height: 15, color: textMuted }} />
                    <a href={`tel:${phoneMobile}`} style={{ color: textPrimary, fontSize: "14px", textDecoration: "none" }} className="hover:underline">{phoneMobile}</a>
                   <span style={{ color: textMuted, fontSize: "12px" }}>Mobile</span>
                </div>
              )}
            </div>
          </GlassCard>
        )}

      </div>

      <GlassCard padding="24px">
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Associated Deals</h3>
        {associatedDeals.length === 0 ? (
          <p style={{ fontSize: "14px", color: textMuted, margin: 0 }}>No deals referred yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {associatedDeals.map((d: any, i: number) => {
              const dealSummary = [
                d.productionBucket,
                d.stage ? d.stage.replace(/_/g, " ") : null,
                typeof d.productionValue === "number" ? `$${d.productionValue.toLocaleString()}` : null,
              ].filter(Boolean).join(" · ");
              return (
                <div
                  key={d.id}
                  onClick={() => openDealCard(d.id)}
                  className="hover-elevate"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    margin: "0 -16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    borderBottom: i < associatedDeals.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none",
                    transition: "background 0.15s"
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{dealDisplayName(d)}</span>
                  {dealSummary && <span style={{ fontSize: "13px", color: textMuted }}>{dealSummary}</span>}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit Agent">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label style={{ fontSize: "12px", color: textMuted, display: "block", marginBottom: "4px" }}>First Name</label><input value={form.firstName || ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={inputStyle} /></div>
            <div><label style={{ fontSize: "12px", color: textMuted, display: "block", marginBottom: "4px" }}>Last Name</label><input value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={inputStyle} /></div>
          </div>
          <div><label style={{ fontSize: "12px", color: textMuted, display: "block", marginBottom: "4px" }}>Title</label><input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: "12px", color: textMuted, display: "block", marginBottom: "4px" }}>Email</label><input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: "12px", color: textMuted, display: "block", marginBottom: "4px" }}>Direct Phone</label><input value={form.phoneDirect || ""} onChange={(e) => setForm({ ...form, phoneDirect: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: "12px", color: textMuted, display: "block", marginBottom: "4px" }}>Mobile Phone</label><input value={form.phoneMobile || ""} onChange={(e) => setForm({ ...form, phoneMobile: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: "12px", color: textMuted, display: "block", marginBottom: "4px" }}>Notes</label><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <GhostButton onClick={() => setEditing(false)}>Cancel</GhostButton>
            <PinkButton onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving..." : "Save Changes"}
            </PinkButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={`${confirmAction} Agent`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p style={{ fontSize: "14px", color: textMuted, lineHeight: 1.5, margin: 0 }}>
            Are you sure you want to {confirmAction?.toLowerCase()} <strong>{agentName}</strong>?
            This will immediately revoke their portal access. Open deals need reassignment.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <GhostButton onClick={() => setConfirmAction(null)}>Cancel</GhostButton>
            <PinkButton
              style={{ background: "#E91E1E", color: "#fff" }}
              disabled={statusMut.isPending}
              onClick={() => {
                if (confirmAction) {
                  statusMut.mutate(confirmAction === "Suspend" ? "Suspended" : "Terminated");
                }
              }}
            >
              {statusMut.isPending ? "Applying..." : `Confirm ${confirmAction}`}
            </PinkButton>
          </div>
        </div>
      </Modal>

    </div>
  );
}
