import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { GlassCard, StatTile, SectionHeader, AxelBadge, PinkButton, GhostButton } from "@/components/ui/axel-index";
import { ArrowUpRight, UserCheck, UserX, KeyRound } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export default function AdminDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: orgs = [] } = useQuery({ queryKey: ["organizations"], queryFn: () => api.get<any[]>("/organizations") });
  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>("/deals") });
  const { data: policies = [] } = useQuery({ queryKey: ["policies"], queryFn: () => api.get<any[]>("/policies") });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => api.get<any[]>("/contacts") });
  const { data: workforce = [] } = useQuery({ queryKey: ["workforce-verticals"], queryFn: () => api.get<any[]>("/workforce/verticals") });
  const { data: registrations = [] } = useQuery({ queryKey: ["agent-registrations"], queryFn: () => api.get<any[]>("/agent-registrations") });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.patch(`/agent-registrations/${id}`, { status: "AGREEMENT_PENDING", reviewedAt: new Date().toISOString() }),
    onSuccess: (_, id) => {
      console.log(`[Agent Registration] Approved. Agreement link: /register/agent/agreement/${id}`);
      qc.invalidateQueries({ queryKey: ["agent-registrations"] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => api.patch(`/agent-registrations/${id}`, { status: "REJECTED", reviewedAt: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-registrations"] }),
  });

  const markCallMut = useMutation({
    mutationFn: (id: string) => api.patch(`/agent-registrations/${id}`, { status: "CREDENTIALS_PENDING", zoomCompletedAt: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-registrations"] }),
  });

  const issueCredsMut = useMutation({
    mutationFn: async (reg: any) => {
      const [partner] = await Promise.all([
        api.post("/partners", {
          partnerType: "Agent", name: `${reg.firstName} ${reg.lastName}`,
          agencyName: reg.agencyName, npn: reg.individualNpn,
          licenseStates: reg.statesLicensed || [], contactName: `${reg.firstName} ${reg.lastName}`,
          contactEmail: reg.email, contactPhone: reg.phone, status: "Active",
        }),
      ]) as any[];
      const tempPassword = `Axel${Math.random().toString(36).slice(2, 8)}!`;
      await api.patch(`/agent-registrations/${reg.id}`, {
        status: "ACTIVE", partnerId: partner.id,
      });
      console.log(`[Agent Registration] Credentials issued for ${reg.email}. Temp password: ${tempPassword}`);
      return { email: reg.email, tempPassword, partnerId: partner.id };
    },
    onSuccess: (result) => {
      alert(`Credentials issued!\nEmail: ${result.email}\nTemp Password: ${result.tempPassword}`);
      qc.invalidateQueries({ queryKey: ["agent-registrations"] });
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
  });

  const pendingRegs = registrations.filter((r: any) => r.status !== "ACTIVE" && r.status !== "REJECTED");

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const subtleBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  const stageColor: Record<string, string> = {
    NEW_LEAD: "blue",
    QUOTING: "yellow",
    PROPOSAL: "pink",
    BOUND: "green",
    LOST: "red",
  };

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="Admin Dashboard" subtitle="Complete platform overview" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatTile label="Organizations" value={orgs.length} />
        <StatTile label="Active Deals" value={deals.length} />
        <StatTile label="Policies" value={policies.length} />
        <StatTile label="Contacts" value={contacts.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Recent Deals</h3>
          {deals.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No deals yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {deals.slice(0, 5).map((d: any) => (
                <div
                  key={d.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: `1px solid ${borderSubtle}` }}
                >
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{d.referenceCode}</p>
                    <p style={{ fontSize: "12px", color: textMuted }}>{d.vertical || "—"} · {d.state || "—"}</p>
                  </div>
                  <AxelBadge label={d.stage?.replace(/_/g, " ") || "—"} color={stageColor[d.stage] || "gray"} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Pipeline Summary</h3>
          {deals.length === 0 ? (
            <p style={{ fontSize: "14px", color: textMuted }}>No pipeline data</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {Object.entries(
                deals.reduce((acc: Record<string, number>, d: any) => {
                  const stage = d.stage || "UNKNOWN";
                  acc[stage] = (acc[stage] || 0) + 1;
                  return acc;
                }, {})
              ).map(([stage, count]) => (
                <div key={stage} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "14px", color: textSecondary }}>{stage.replace(/_/g, " ")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "96px", height: "8px", borderRadius: "9999px", overflow: "hidden", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                      <div style={{ height: "100%", borderRadius: "9999px", width: `${((count as number) / deals.length) * 100}%`, background: "#E91E8C" }} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, width: "24px", textAlign: "right" }}>{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {pendingRegs.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <GlassCard>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Agent Applications ({pendingRegs.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pendingRegs.map((r: any) => {
                const statusLabels: Record<string, string> = {
                  PENDING_REVIEW: "Pending Review", AGREEMENT_PENDING: "Agreement Pending",
                  ONBOARDING_CALL_PENDING: "Onboarding Call Pending", CREDENTIALS_PENDING: "Credentials Pending",
                };
                const statusColors: Record<string, string> = {
                  PENDING_REVIEW: "yellow", AGREEMENT_PENDING: "blue", ONBOARDING_CALL_PENDING: "orange", CREDENTIALS_PENDING: "light-violet",
                };
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: subtleBg, borderRadius: "10px", border: `1px solid ${borderSubtle}` }}>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: 0 }}>{r.firstName} {r.lastName}</p>
                      <p style={{ fontSize: "12px", color: textMuted, margin: "2px 0 0" }}>{r.agencyName} · {r.email}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <AxelBadge label={statusLabels[r.status] || r.status} color={statusColors[r.status] || "gray"} />
                      {r.status === "PENDING_REVIEW" && (
                        <>
                          <GhostButton onClick={() => approveMut.mutate(r.id)} style={{ padding: "4px 10px", fontSize: "12px", color: "#1EE97B" }}>
                            <UserCheck style={{ width: 14, height: 14 }} /> Approve
                          </GhostButton>
                          <GhostButton onClick={() => rejectMut.mutate(r.id)} style={{ padding: "4px 10px", fontSize: "12px", color: "#E91E1E" }}>
                            <UserX style={{ width: 14, height: 14 }} /> Reject
                          </GhostButton>
                        </>
                      )}
                      {r.status === "ONBOARDING_CALL_PENDING" && (
                        <GhostButton onClick={() => markCallMut.mutate(r.id)} style={{ padding: "4px 10px", fontSize: "12px" }}>
                          <UserCheck style={{ width: 14, height: 14 }} /> Mark Call Complete
                        </GhostButton>
                      )}
                      {r.status === "CREDENTIALS_PENDING" && (
                        <PinkButton onClick={() => issueCredsMut.mutate(r)} style={{ padding: "4px 12px", fontSize: "12px" }}>
                          <KeyRound style={{ width: 14, height: 14 }} /> Issue Credentials
                        </PinkButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Workforce Verticals</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {workforce.slice(0, 6).map((v: any) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "6px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                <span style={{ fontSize: "14px", color: textSecondary }}>{v.vertical}</span>
                <span style={{ fontSize: "14px", fontWeight: 500, color: textPrimary }}>{v.clientCount} clients</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, marginBottom: "16px" }}>Quick Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { label: "New Deal", desc: "Create a new pipeline entry" },
              { label: "Add Organization", desc: "Register a new org" },
              { label: "View Reports", desc: "Analytics and insights" },
              { label: "Manage Tasks", desc: "View task queue" },
            ].map((action) => (
              <button
                key={action.label}
                style={{ textAlign: "left", padding: "16px", borderRadius: "12px", background: subtleBg, border: `1px solid ${borderSubtle}`, cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(233,30,140,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = borderSubtle)}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: 0 }}>{action.label}</p>
                  <ArrowUpRight style={{ width: "14px", height: "14px", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }} />
                </div>
                <p style={{ fontSize: "12px", marginTop: "4px", color: textMuted }}>{action.desc}</p>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
