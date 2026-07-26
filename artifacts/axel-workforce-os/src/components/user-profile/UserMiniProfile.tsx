import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { AxelBadge } from "@/components/ui/axel-index";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { Mail, Phone, ArrowUpRight, Check, Copy } from "lucide-react";

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

/** Normalized shape the popover renders. Used for non-user entities (e.g. network
 * partners in global search) that aren't backed by a user_profiles row. */
export interface MiniProfileData {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  role?: string | null;
  orgName?: string | null;
  avatarUrl?: string | null;
}

interface UserMiniProfileProps {
  /** When set, the popover lazily fetches this user's profile. */
  userId?: string;
  /** Inline data for non-user entities; skips the fetch entirely. */
  inlineProfile?: MiniProfileData;
  /** Custom handler for the footer link (defaults to navigating to /users/:id). */
  onView?: () => void;
  viewLabel?: string;
  children: ReactNode;
  align?: "start" | "center" | "end";
}

function CopyRow({
  icon: Icon,
  value,
  copied,
  onCopy,
  c,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  value: string;
  copied: string | null;
  onCopy: (v: string) => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  const isCopied = copied === value;
  return (
    <button
      type="button"
      onClick={() => onCopy(value)}
      title="Click to copy"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        fontSize: 12,
        color: c.textSecondary,
      }}
    >
      <Icon style={{ width: 13, height: 13, color: c.textMuted, flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{value}</span>
      {isCopied ? (
        <Check style={{ width: 12, height: 12, color: "var(--accent-primary)", flexShrink: 0 }} />
      ) : (
        <Copy style={{ width: 12, height: 12, color: c.textMuted, flexShrink: 0 }} />
      )}
    </button>
  );
}

/**
 * Shared hover popover. Either pass a `userId` (lazily fetches the full profile
 * summary and links to /users/:id) or an `inlineProfile` for non-user entities
 * such as network partners surfaced in global search.
 */
export default function UserMiniProfile({
  userId,
  inlineProfile,
  onView,
  viewLabel = "View full profile",
  children,
  align = "start",
}: UserMiniProfileProps) {
  const c = useThemeColors();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(value);
        window.setTimeout(() => setCopied((cur) => (cur === value ? null : cur)), 1500);
      },
      () => {},
    );
  };

  const { data: fetched, isLoading: fetching } = useGetUserProfile(userId ?? "", {
    query: {
      enabled: open && !!userId && !inlineProfile,
      queryKey: getGetUserProfileQueryKey(userId ?? ""),
    },
  });

  const profile: MiniProfileData | null = inlineProfile ?? fetched ?? null;
  const isLoading = !inlineProfile && fetching;

  const name =
    profile && (profile.firstName || profile.lastName)
      ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
      : profile?.email ?? "User";
  const role = profile?.role ?? "";
  const phone = profile?.phone || profile?.mobile || "";

  const handleView = () => {
    if (onView) onView();
    else if (userId) navigate(`/users/${userId}`);
  };
  const showView = !!onView || !!userId;

  return (
    <HoverCard openDelay={150} closeDelay={100} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align={align}
        style={{
          width: 280,
          padding: 0,
          zIndex: 200,
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
                {!profile.avatarUrl && initials(profile.firstName, profile.lastName, profile.email ?? undefined)}
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
              {profile.email && <CopyRow icon={Mail} value={profile.email} copied={copied} onCopy={copy} c={c} />}
              {phone && <CopyRow icon={Phone} value={phone} copied={copied} onCopy={copy} c={c} />}
            </div>

            {showView && (
              <button
                onClick={handleView}
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
                {viewLabel}
                <ArrowUpRight style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
