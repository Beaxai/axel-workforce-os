import { Mail, Phone, Building2, User, UserCircle, Edit2, Shield } from "lucide-react";
import { Badge, GhostButton, GlassCard } from "./axel-index";
import { useThemeStore } from "@/lib/theme-store";

export type ContactCardVariant = "agency" | "agent" | "client_contact" | "staff" | "partner_contact";

interface ContactCardProps {
  variant: ContactCardVariant;
  name: string;
  title?: string;
  role?: string;
  email?: string;
  phoneDirect?: string;
  phoneMobile?: string;
  isPrimary?: boolean;
  status?: string;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePrimary?: () => void;
  onClick?: () => void;
}

export function ContactCard({
  variant,
  name,
  title,
  role,
  email,
  phoneDirect,
  phoneMobile,
  isPrimary,
  status,
  subtitle,
  footer,
  onEdit,
  onClick,
}: ContactCardProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const iconColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const roleLabel = role
    ? role === "csr"
      ? "CSR"
      : role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "";
  const isContact = variant === "client_contact" || variant === "partner_contact";
  const statusKey = status?.toLowerCase();
  const statusStyle =
    statusKey === "active"
      ? { color: "#1EE97B", background: "rgba(30,233,123,0.15)" }
      : statusKey === "pending"
        ? { color: "#E9C31E", background: "rgba(233,195,30,0.15)" }
        : { color: "#E91E1E", background: "rgba(233,30,30,0.15)" };

  const getIcon = () => {
    switch (variant) {
      case "agency": return <Building2 style={{ width: 16, height: 16, color: "var(--accent-primary)" }} />;
      case "agent": return <UserCircle style={{ width: 16, height: 16, color: "#1E6BE9" }} />;
      case "staff": return <Shield style={{ width: 16, height: 16, color: "#7C3AED" }} />;
      default: return <User style={{ width: 16, height: 16, color: iconColor }} />;
    }
  };

  return (
    <GlassCard
      padding="16px"
      onClick={onClick}
      style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", cursor: onClick ? "pointer" : undefined }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            {getIcon()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <p style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: 0 }}>{name}</p>
              {isPrimary && (
                <span style={{ color: "#E91E8C", background: "rgba(233,30,140,0.15)", borderRadius: "999px", padding: "2px 7px", fontSize: "10px", fontWeight: 700 }}>
                  Primary
                </span>
              )}
            </div>
            {((!isContact && title) || roleLabel) && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                {!isContact && title && <span style={{ fontSize: "12px", color: textMuted }}>{title}</span>}
                {!isContact && title && roleLabel && <span style={{ color: textMuted, fontSize: "10px" }}>·</span>}
                {roleLabel && <span style={{ fontSize: "10px", color: textMuted, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", borderRadius: "999px", padding: "2px 7px" }}>{roleLabel}</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {status && !isPrimary && (
            <span style={{ ...statusStyle, borderRadius: "999px", padding: "3px 8px", fontSize: "10px", fontWeight: 700 }}>
              {status}
            </span>
          )}
          {onEdit && (
            <GhostButton onClick={(event) => { event.stopPropagation(); onEdit(); }} style={{ padding: "4px 8px" }}>
              <Edit2 style={{ width: 14, height: 14 }} />
            </GhostButton>
          )}
        </div>
      </div>

      {(email || phoneDirect || phoneMobile || subtitle) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginLeft: "42px" }}>
          {subtitle && <div style={{ fontSize: "13px", color: textMuted }}>{subtitle}</div>}

          {(email || phoneDirect || phoneMobile) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: subtitle ? "4px" : "0" }}>
              {email && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Mail style={{ width: 12, height: 12, color: iconColor }} />
                   <a href={`mailto:${email}`} onClick={(event) => event.stopPropagation()} style={{ fontSize: "13px", color: "#E91E8C", textDecoration: "none" }} className="hover:underline">
                    {email}
                  </a>
                </div>
              )}
              {phoneDirect && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Phone style={{ width: 12, height: 12, color: iconColor }} />
                   <a href={`tel:${phoneDirect}`} onClick={(event) => event.stopPropagation()} style={{ fontSize: "13px", color: textPrimary, textDecoration: "none" }}>
                    {phoneDirect} <span style={{ color: textMuted, fontSize: "11px", marginLeft: "4px" }}>(Direct)</span>
                  </a>
                </div>
              )}
              {phoneMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Phone style={{ width: 12, height: 12, color: iconColor }} />
                   <a href={`tel:${phoneMobile}`} onClick={(event) => event.stopPropagation()} style={{ fontSize: "13px", color: textPrimary, textDecoration: "none" }}>
                    {phoneMobile} <span style={{ color: textMuted, fontSize: "11px", marginLeft: "4px" }}>(Mobile)</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {footer && (
        <div style={{ marginTop: "4px", paddingTop: "12px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
          {footer}
        </div>
      )}
    </GlassCard>
  );
}
