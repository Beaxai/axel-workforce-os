import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { AxelBadge } from "@/components/ui/axel-index";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { Mail, Phone, ArrowUpRight } from "lucide-react";

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

function initials(first?: string | null, last?: string | null, email?: string): string {
  const a = (first || "").trim();
  const b = (last || "").trim();
  if (a || b) return `${a[0] ?? ""}${b[0] ?? ""}`.toUpperCase() || "?";
  return (email?.[0] ?? "?").toUpperCase();
}

interface UserMiniProfileProps {
  userId: string;
  children: ReactNode;
  align?: "start" | "center" | "end";
}

/**
 * Shared hover popover that lazily fetches a user's profile summary and links to
 * the full profile page. Wrap any avatar/name trigger with this.
 */
export default function UserMiniProfile({ userId, children, align = "start" }: UserMiniProfileProps) {
  const c = useThemeColors();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: profile, isLoading } = useGetUserProfile(userId, {
    query: { enabled: open && !!userId, queryKey: getGetUserProfileQueryKey(userId) },
  });

  const name =
    profile && (profile.firstName || profile.lastName)
      ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
      : profile?.email ?? "User";
  const role = profile?.role ?? "";

  return (
    <HoverCard openDelay={150} closeDelay={100} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align={align}
        style={{
          width: 280,
          padding: 0,
          background: c.dropdownBg,
          border: `1px solid ${c.borderColor}`,
          borderRadius: 12,
          backdropFilter: "blur(40px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
      >
        {isLoading || !profile ? (
          <div style={{ padding: 16, fontSize: 13, color: c.textMuted }}>
            {isLoading ? "Loading…" : "Profile unavailable"}
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
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
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: c.textPrimary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {name}
                </p>
                {profile.title && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: c.textMuted,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {profile.title}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {role && <AxelBadge label={ROLE_LABEL[role] ?? role} color={ROLE_BADGE_COLOR[role] ?? "gray"} />}
              {profile.orgName && <AxelBadge label={profile.orgName} color="gray" />}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {profile.email && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.textSecondary }}>
                  <Mail style={{ width: 13, height: 13, color: c.textMuted, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {profile.email}
                  </span>
                </div>
              )}
              {(profile.phone || profile.mobile) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.textSecondary }}>
                  <Phone style={{ width: 13, height: 13, color: c.textMuted, flexShrink: 0 }} />
                  <span>{profile.phone || profile.mobile}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/users/${userId}`)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: "var(--accent-primary-soft)",
                color: "var(--accent-primary)",
              }}
            >
              View full profile
              <ArrowUpRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
