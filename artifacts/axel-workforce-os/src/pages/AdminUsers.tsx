import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard, SectionHeader, PinkButton, GhostButton, AxelBadge, AxelModal } from "@/components/ui/axel-index";
import { useThemeColors } from "@/lib/use-theme-colors";
import { api } from "@/lib/api";
import {
  useInviteUser,
  useUpdateUserStatus,
  useApproveAgentRegistration,
  type InviteUserRequest,
} from "@workspace/api-client-react";
import { PartyRole } from "@workspace/api-client-react";
import UserMiniProfile from "@/components/user-profile/UserMiniProfile";
import { UserPlus, Check, X } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  status?: string | null;
}

interface RegistrationRow {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  agencyName?: string | null;
  status?: string | null;
  userId?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  UNDERWRITER: "Underwriter",
  CSA: "CSA / Account Manager",
  AGENT: "Agent / Broker",
  EMPLOYER: "Employer / Client",
  CARRIER: "Carrier",
  PEO: "PEO Partner",
  VENDOR: "Vendor",
};

const ROLE_BADGE_COLOR: Record<string, string> = {
  ADMIN: "purple",
  UNDERWRITER: "blue",
  CSA: "pink",
  AGENT: "green",
  EMPLOYER: "gray",
  CARRIER: "blue",
  PEO: "purple",
  VENDOR: "gray",
};

const STATUS_COLOR: Record<string, string> = {
  active: "green",
  invited: "yellow",
  deactivated: "gray",
};

const ROLE_OPTIONS: PartyRole[] = [
  PartyRole.ADMIN,
  PartyRole.UNDERWRITER,
  PartyRole.CSA,
  PartyRole.AGENT,
  PartyRole.EMPLOYER,
  PartyRole.CARRIER,
  PartyRole.PEO,
  PartyRole.VENDOR,
];

export default function AdminUsers() {
  const c = useThemeColors();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteUser = useInviteUser();
  const updateStatus = useUpdateUserStatus();
  const approveReg = useApproveAgentRegistration();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        api.get<UserRow[]>("/users"),
        api.get<RegistrationRow[]>("/agent-registrations"),
      ]);
      setUsers(u);
      setRegistrations(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingRegs = registrations.filter(
    (r) => !r.userId && !/declin/i.test(r.status ?? ""),
  );

  async function handleToggleStatus(u: UserRow) {
    const next = u.status === "deactivated" ? "active" : "deactivated";
    try {
      await updateStatus.mutateAsync({ id: u.id, data: { status: next } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveReg.mutateAsync({ id });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve registration");
    }
  }

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: c.textMuted,
    padding: "10px 12px",
    borderBottom: `1px solid ${c.borderColor}`,
  };

  const tdStyle: React.CSSProperties = {
    fontSize: 13,
    color: c.textSecondary,
    padding: "12px",
    borderBottom: `1px solid ${c.borderColor}`,
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <SectionHeader title="User Management" subtitle="Manage team members, invitations, and agent approvals" />
        <PinkButton onClick={() => setInviteOpen(true)}>
          <UserPlus style={{ width: 14, height: 14, marginRight: 6 }} /> Invite User
        </PinkButton>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#ef4444",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Pending agent registrations */}
      {pendingRegs.length > 0 && (
        <GlassCard padding="0" style={{ marginBottom: 24, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.borderColor}` }}>
            <h2 className="font-heading" style={{ margin: 0, fontSize: 13, color: c.sectionHeading }}>
              PENDING AGENT REGISTRATIONS
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Agency</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingRegs.map((r) => (
                  <tr key={r.id}>
                    <td style={tdStyle}>{`${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "\u2014"}</td>
                    <td style={tdStyle}>{r.email || "\u2014"}</td>
                    <td style={tdStyle}>{r.agencyName || "\u2014"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <PinkButton onClick={() => handleApprove(r.id)} disabled={approveReg.isPending}>
                        <Check style={{ width: 13, height: 13, marginRight: 4 }} /> Approve
                      </PinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Users table */}
      <GlassCard padding="0" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.borderColor}` }}>
          <h2 className="font-heading" style={{ margin: 0, fontSize: 13, color: c.sectionHeading }}>
            TEAM MEMBERS
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;
                  const role = u.role ?? "";
                  const status = u.status ?? "active";
                  return (
                    <tr key={u.id}>
                      <td style={tdStyle}>
                        <UserMiniProfile userId={u.id}>
                          <button
                            onClick={() => navigate(`/users/${u.id}`)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--accent-primary)",
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 600,
                              padding: 0,
                            }}
                          >
                            {name}
                          </button>
                        </UserMiniProfile>
                      </td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>
                        {role ? <AxelBadge label={ROLE_LABEL[role] ?? role} color={ROLE_BADGE_COLOR[role] ?? "gray"} /> : "\u2014"}
                      </td>
                      <td style={tdStyle}>
                        <AxelBadge label={status} color={STATUS_COLOR[status] ?? "gray"} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <GhostButton onClick={() => handleToggleStatus(u)} disabled={updateStatus.isPending}>
                          {status === "deactivated" ? (
                            <>
                              <Check style={{ width: 13, height: 13, marginRight: 4 }} /> Reactivate
                            </>
                          ) : (
                            <>
                              <X style={{ width: 13, height: 13, marginRight: 4 }} /> Deactivate
                            </>
                          )}
                        </GhostButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {inviteOpen && (
        <InviteModal
          c={c}
          pending={inviteUser.isPending}
          onClose={() => setInviteOpen(false)}
          onSubmit={async (data) => {
            setError(null);
            try {
              await inviteUser.mutateAsync({ data });
              setInviteOpen(false);
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to invite user");
            }
          }}
        />
      )}
    </div>
  );
}

function InviteModal({
  c,
  pending,
  onClose,
  onSubmit,
}: {
  c: ReturnType<typeof useThemeColors>;
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: InviteUserRequest) => void;
}) {
  const [form, setForm] = useState<InviteUserRequest>({
    email: "",
    firstName: "",
    lastName: "",
    role: PartyRole.AGENT,
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${c.inputBorder}`,
    background: c.inputBg,
    color: c.inputText,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: c.labelText,
    marginBottom: 4,
    display: "block",
  };

  const valid = form.email.trim() && form.firstName.trim() && form.lastName.trim();

  return (
    <AxelModal isOpen onClose={onClose} title="Invite User">
      <div style={{ width: 392, maxWidth: "100%" }}>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: c.textMuted }}>
          The user will be created with status "invited" and can set a password via the reset flow.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input style={inputStyle} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input style={inputStyle} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select
              style={inputStyle}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as PartyRole })}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r} style={{ background: c.dropdownBg, color: c.inputText }}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Title (optional)</label>
            <input style={inputStyle} value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PinkButton onClick={() => onSubmit(form)} disabled={!valid || pending}>
            {pending ? "Inviting…" : "Send Invite"}
          </PinkButton>
        </div>
      </div>
    </AxelModal>
  );
}
