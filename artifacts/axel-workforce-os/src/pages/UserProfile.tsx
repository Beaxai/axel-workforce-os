import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GlassCard, SectionHeader, PinkButton, GhostButton, AxelBadge } from "@/components/ui/axel-index";
import { useThemeColors } from "@/lib/use-theme-colors";
import { useAuthStore } from "@/lib/auth-store";
import {
  useGetUserProfile,
  useGetUserActivity,
  useUpdateUserProfile,
  useChangeUserPassword,
  getGetUserProfileQueryKey,
  getGetUserActivityQueryKey,
  type UpdateUserProfileRequest,
} from "@workspace/api-client-react";
import { ArrowLeft, Mail, Phone, Clock, Calendar, Briefcase, FileText, KeyRound } from "lucide-react";

const INTERNAL_ROLES = new Set(["ADMIN", "UNDERWRITER", "CSA"]);

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

const STATUS_COLOR: Record<string, string> = {
  active: "green",
  invited: "yellow",
  deactivated: "gray",
};

function initials(first?: string | null, last?: string | null, email?: string): string {
  const a = (first || "").trim();
  const b = (last || "").trim();
  if (a || b) return `${a[0] ?? ""}${b[0] ?? ""}`.toUpperCase() || "?";
  return (email?.[0] ?? "?").toUpperCase();
}

function fmtDate(v?: string | null): string {
  if (!v) return "\u2014";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

interface UserProfileProps {
  /** When true, resolve the id from the authenticated user (the /profile route). */
  self?: boolean;
}

export default function UserProfile({ self = false }: UserProfileProps) {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const c = useThemeColors();
  const authUser = useAuthStore((s) => s.user);

  const userId = self ? authUser?.id ?? "" : params.id ?? "";
  const isSelf = !!authUser && authUser.id === userId;
  const isInternalViewer = !!authUser && INTERNAL_ROLES.has(authUser.role);
  const isAdmin = authUser?.role === "ADMIN";

  const { data: profile, isLoading, refetch } = useGetUserProfile(userId, {
    query: { enabled: !!userId, queryKey: getGetUserProfileQueryKey(userId) },
  });
  const { data: activity } = useGetUserActivity(userId, {
    query: { enabled: !!userId && isInternalViewer, queryKey: getGetUserActivityQueryKey(userId) },
  });
  const updateProfile = useUpdateUserProfile();
  const changePassword = useChangeUserPassword();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<UpdateUserProfileRequest>({});
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        phone: profile.phone ?? "",
        mobile: profile.mobile ?? "",
        timezone: profile.timezone ?? "",
        title: profile.title ?? "",
        bio: profile.bio ?? "",
        internalNotes: profile.internalNotes ?? "",
      });
    }
  }, [profile]);

  // Self can edit contact fields; admins can additionally edit title/bio/internal notes.
  const canEdit = isSelf || isAdmin;
  const canEditAdminFields = isAdmin;

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

  async function handleSave() {
    if (!userId) return;
    const payload: UpdateUserProfileRequest = isSelf && !isAdmin
      ? { phone: form.phone, mobile: form.mobile, timezone: form.timezone }
      : form;
    await updateProfile.mutateAsync({ id: userId, data: payload });
    setEditMode(false);
    refetch();
  }

  async function handleChangePassword() {
    if (!userId) return;
    setPwError(null);
    setPwSuccess(false);
    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    if (isSelf && !pwForm.currentPassword) {
      setPwError("Enter your current password.");
      return;
    }
    try {
      await changePassword.mutateAsync({
        id: userId,
        data: {
          newPassword: pwForm.newPassword,
          ...(isSelf ? { currentPassword: pwForm.currentPassword } : {}),
        },
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwSuccess(true);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Failed to change password.");
    }
  }

  if (!userId) {
    return (
      <div style={{ padding: "40px" }}>
        <p style={{ color: c.textMuted }}>No user selected.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "40px" }}>
        <p style={{ color: c.textMuted }}>Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: "40px" }}>
        <GhostButton onClick={() => navigate(-1)}>
          <ArrowLeft style={{ width: 14, height: 14, marginRight: 6 }} /> Back
        </GhostButton>
        <p style={{ color: c.textMuted, marginTop: 16 }}>
          Profile not found or you don't have access to view it.
        </p>
      </div>
    );
  }

  const name =
    profile.firstName || profile.lastName
      ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
      : profile.email;
  const role = profile.role ?? "";
  const status = profile.status ?? "active";
  const roleData = (profile.roleSection?.data ?? {}) as Record<string, unknown>;
  const book =
    profile.roleSection?.kind?.toUpperCase() === "AGENT"
      ? ((roleData.bookSummary as Record<string, unknown> | undefined) ?? null)
      : null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 40px" }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: c.textMuted,
          cursor: "pointer",
          fontSize: 13,
          marginBottom: 20,
          padding: 0,
        }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} /> Back
      </button>

      {/* Identity header */}
      <GlassCard padding="24px" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
              background: "var(--accent-primary-soft)",
              color: "var(--accent-primary)",
              backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!profile.avatarUrl && initials(profile.firstName, profile.lastName, profile.email)}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: c.textPrimary }}>{name}</h1>
            {profile.title && (
              <p style={{ margin: "4px 0 0", fontSize: 14, color: c.textMuted }}>{profile.title}</p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {role && <AxelBadge label={ROLE_LABEL[role] ?? role} color={ROLE_BADGE_COLOR[role] ?? "gray"} />}
              <AxelBadge label={status} color={STATUS_COLOR[status] ?? "gray"} />
              {profile.orgName && <AxelBadge label={profile.orgName} color="gray" />}
            </div>
          </div>
          {canEdit && !editMode && (
            <PinkButton onClick={() => setEditMode(true)}>Edit Profile</PinkButton>
          )}
          {editMode && (
            <div style={{ display: "flex", gap: 8 }}>
              <GhostButton onClick={() => setEditMode(false)}>Cancel</GhostButton>
              <PinkButton onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving…" : "Save"}
              </PinkButton>
            </div>
          )}
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Contact + details */}
          <GlassCard padding="24px">
            <h2 className="font-heading" style={{ margin: "0 0 16px", fontSize: 13, color: c.sectionHeading }}>
              CONTACT & DETAILS
            </h2>
            {editMode ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input
                    style={inputStyle}
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Mobile</label>
                  <input
                    style={inputStyle}
                    value={form.mobile ?? ""}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Timezone</label>
                  <input
                    style={inputStyle}
                    value={form.timezone ?? ""}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  />
                </div>
                {canEditAdminFields && (
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input
                      style={inputStyle}
                      value={form.title ?? ""}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <DetailRow icon={Mail} label="Email" value={profile.email} c={c} />
                <DetailRow icon={Phone} label="Phone" value={profile.phone || "\u2014"} c={c} />
                <DetailRow icon={Phone} label="Mobile" value={profile.mobile || "\u2014"} c={c} />
                <DetailRow icon={Clock} label="Timezone" value={profile.timezone || "\u2014"} c={c} />
                <DetailRow icon={Calendar} label="Date Joined" value={fmtDate(profile.dateJoined)} c={c} />
                <DetailRow icon={Clock} label="Last Login" value={fmtDate(profile.lastLoginAt)} c={c} />
              </div>
            )}
          </GlassCard>

          {/* Bio (internal viewers only) */}
          {isInternalViewer && (
            <GlassCard padding="24px">
              <h2 className="font-heading" style={{ margin: "0 0 16px", fontSize: 13, color: c.sectionHeading }}>
                BIO
              </h2>
              {editMode && canEditAdminFields ? (
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                  value={form.bio ?? ""}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              ) : (
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: c.textSecondary }}>
                  {profile.bio || "No bio provided."}
                </p>
              )}
            </GlassCard>
          )}

          {/* Change password (self or admin) */}
          {canEdit && (
            <GlassCard padding="24px">
              <h2
                className="font-heading"
                style={{ margin: "0 0 16px", fontSize: 13, color: c.sectionHeading, display: "flex", alignItems: "center", gap: 8 }}
              >
                <KeyRound style={{ width: 14, height: 14 }} /> CHANGE PASSWORD
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
                {isSelf && (
                  <div>
                    <label style={labelStyle}>Current password</label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      style={inputStyle}
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>New password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    style={inputStyle}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Confirm new password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    style={inputStyle}
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  />
                </div>
                {pwError && (
                  <p style={{ margin: 0, fontSize: 13, color: "#ef4444" }}>{pwError}</p>
                )}
                {pwSuccess && (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--accent-primary)" }}>
                    Password updated.
                  </p>
                )}
                <div>
                  <PinkButton onClick={handleChangePassword} disabled={changePassword.isPending}>
                    {changePassword.isPending ? "Updating…" : "Update password"}
                  </PinkButton>
                </div>
                {!isSelf && isAdmin && (
                  <p style={{ margin: 0, fontSize: 12, color: c.textSecondary }}>
                    As an admin you can reset this user's password without their current one.
                  </p>
                )}
              </div>
            </GlassCard>
          )}

          {/* Internal notes (internal viewers only) */}
          {isInternalViewer && (
            <GlassCard padding="24px">
              <h2 className="font-heading" style={{ margin: "0 0 16px", fontSize: 13, color: c.sectionHeading }}>
                INTERNAL NOTES
              </h2>
              {editMode && canEditAdminFields ? (
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                  value={form.internalNotes ?? ""}
                  onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                />
              ) : (
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: c.textSecondary }}>
                  {profile.internalNotes || "No internal notes."}
                </p>
              )}
            </GlassCard>
          )}

          {/* Recent activity (internal viewers only) */}
          {isInternalViewer && activity && activity.items.length > 0 && (
            <GlassCard padding="24px">
              <h2 className="font-heading" style={{ margin: "0 0 16px", fontSize: 13, color: c.sectionHeading }}>
                RECENT ACTIVITY
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activity.items.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Clock style={{ width: 13, height: 13, color: c.textMuted, marginTop: 3, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, color: c.textSecondary }}>{item.description}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: c.textMuted }}>
                        {fmtDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right rail — role section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {book && (
            <GlassCard padding="24px">
              <h2 className="font-heading" style={{ margin: "0 0 16px", fontSize: 13, color: c.sectionHeading }}>
                BOOK OF BUSINESS
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <BookStat label="Total Premium" value={fmtMoney(Number(book.totalPremium ?? 0))} c={c} highlight />
                <BookStat label="Deals" value={String(book.dealCount ?? 0)} c={c} />
                <BookStat label="Bound" value={String(book.boundCount ?? 0)} c={c} />
                <BookStat label="Bound Premium" value={fmtMoney(Number(book.boundPremium ?? 0))} c={c} />
              </div>
            </GlassCard>
          )}

          {isInternalViewer && profile.openTasks && profile.openTasks.length > 0 && (
            <GlassCard padding="24px">
              <h2 className="font-heading" style={{ margin: "0 0 16px", fontSize: 13, color: c.sectionHeading }}>
                OPEN TASKS
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {profile.openTasks.map((t) => (
                  <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Briefcase style={{ width: 13, height: 13, color: c.textMuted, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: c.textSecondary }}>{t.taskName}</p>
                      {t.dueDate && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: c.textMuted }}>
                          Due {fmtDate(t.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {isInternalViewer && profile.activeDeals && profile.activeDeals.length > 0 && (
            <GlassCard padding="24px">
              <h2 className="font-heading" style={{ margin: "0 0 16px", fontSize: 13, color: c.sectionHeading }}>
                ACTIVE DEALS
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {profile.activeDeals.map((d) => (
                  <div key={d.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <FileText style={{ width: 13, height: 13, color: c.textMuted, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: c.textSecondary }}>
                        {d.businessName || d.referenceCode}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: c.textMuted }}>
                        {d.referenceCode}
                        {d.stage ? ` · ${d.stage}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  c,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  value: string;
  c: ReturnType<typeof useThemeColors>;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon style={{ width: 12, height: 12, color: c.textMuted }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: c.textMuted,
          }}
        >
          {label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: c.textPrimary, wordBreak: "break-word" }}>{value}</p>
    </div>
  );
}

function BookStat({
  label,
  value,
  c,
  highlight,
}: {
  label: string;
  value: string;
  c: ReturnType<typeof useThemeColors>;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 12, color: c.textMuted }}>{label}</span>
      <span
        style={{
          fontSize: highlight ? 18 : 14,
          fontWeight: highlight ? 700 : 600,
          color: highlight ? "var(--accent-primary)" : c.textPrimary,
        }}
      >
        {value}
      </span>
    </div>
  );
}
