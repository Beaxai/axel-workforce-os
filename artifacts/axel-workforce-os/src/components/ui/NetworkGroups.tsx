import { useState } from "react";
import { GlassCard, ContactCard, ContactModal } from "./axel-index";
import { ChevronDown, ChevronRight, Plus, Mail } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from "@/hooks/use-contacts";
import { useContactRoles } from "@/hooks/use-contact-roles";
import { FileCheck, FileMinus, ShieldAlert, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function formatK(num: number): string {
  if (!num) return "$0K";
  if (num < 1000) return `$${num.toLocaleString()}`;
  return `$${(num / 1000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K`;
}

export function SplitProductionLine({ metrics }: { metrics: any }) {
  if (!metrics || (metrics.wcDeals === 0 && metrics.peoDeals === 0 && metrics.asoDeals === 0)) {
    return <span style={{ color: "var(--text-muted)", fontSize: "12px", opacity: 0.7 }}>No production yet</span>;
  }
  const parts = [];
  if (metrics.wcDeals > 0) parts.push(`WC ${metrics.wcDeals} · ${formatK(metrics.wcPremium)}`);
  if (metrics.peoDeals > 0) parts.push(`PEO ${metrics.peoDeals} · ${formatK(metrics.peoPremium)}`);
  if (metrics.asoDeals > 0) parts.push(`ASO ${metrics.asoDeals} · ${formatK(metrics.asoFees)}`);

  return (
    <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap" }}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span style={{ opacity: 0.25, margin: "0 6px" }}>|</span>}
        </span>
      ))}
    </span>
  );
}

function parseCityState(address?: string) {
  if (!address) return null;
  const match = address.match(/(?:^|,\s*)([^,]+?)\s+([A-Z]{2})\s+\d{5}(?:-\d{4})?$/i);
  return match ? `${match[1].trim()}, ${match[2].toUpperCase()}` : null;
}

export function AgencyTile({ agency, agencyId, agencyName, agencyStatus, agents }: { agency?: any, agencyId: string, agencyName: string, agencyStatus: string, agents: any[] }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.52)";

  const legalName = agency?.legalName || agencyName || "Unassigned Agency";
  const initials = legalName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase()).join("") || "A";
  const cityState = parseCityState(agency?.address);
  const agencyIsActive = agencyStatus?.toLowerCase() === "active";
  const hasAgreement = Boolean(agency?.agreementSignedAt);
  const eoExpiration = agency?.eoExpirationDate ? new Date(agency.eoExpirationDate) : null;
  const todayKey = new Date().toISOString().slice(0, 10);
  const eoKey = eoExpiration && !Number.isNaN(eoExpiration.getTime()) ? (
    typeof agency.eoExpirationDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(agency.eoExpirationDate)
      ? agency.eoExpirationDate
      : eoExpiration.toISOString().slice(0, 10)
  ) : null;
  const isEoExpired = eoKey ? eoKey < todayKey : false;
  const hasEo = Boolean(eoKey);

  return (
    <GlassCard
      padding="0"
      className="hover-elevate"
      style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}
      onClick={() => navigate(`/network/agencies/${agencyId}`)}
    >
      <div style={{ padding: "16px", display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(233,30,140,0.15)", color: "#E91E8C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 600, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 2px", color: textPrimary, fontSize: "14px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{legalName}</p>
          <p style={{ margin: 0, fontSize: "12px", color: textMuted }}>
            {agents.length} agent{agents.length !== 1 && "s"}{cityState ? ` · ${cityState}` : ""}
          </p>
        </div>
        <div style={{ padding: "2px 6px", borderRadius: "999px", background: agencyIsActive ? "rgba(30,233,123,0.15)" : "rgba(233,195,30,0.15)", color: agencyIsActive ? "#1EE97B" : "#E9C31E", fontSize: "11px", fontWeight: 600, flexShrink: 0 }}>
          {agencyStatus || "Active"}
        </div>
      </div>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {hasAgreement ? (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "#1EE97B" }}>
              <FileCheck style={{ width: 13, height: 13 }} /> Agreement
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: textMuted }}>
              <FileMinus style={{ width: 13, height: 13 }} /> No agreement
            </span>
          )}
          {hasEo && (
            isEoExpired ? (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "#E91E1E" }}>
                <ShieldAlert style={{ width: 13, height: 13 }} /> E&O expired
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "#1EE97B" }}>
                <ShieldCheck style={{ width: 13, height: 13 }} /> E&O
              </span>
            )
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flex: 1, minWidth: 0, overflow: "hidden" }}>
          <SplitProductionLine metrics={agency?.productionMetrics} />
        </div>
      </div>
    </GlassCard>
  );
}

export function OrgGroupCard({ org, type }: { org: any, type: string }) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  const entityTypeMap: Record<string, string> = {
    "Carriers": "carrier",
    "PEO Partners": "peo_partner",
    "Vendors": "vendor",
  };
  const entityType = entityTypeMap[type] || "vendor";
  const { data: contacts = [] } = useContacts(entityType, org.id, expanded);
  const { data: roleVocabulary } = useContactRoles();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  const renderOrgSubtitle = () => {
    if (type === "Carriers") {
      return (org.licenseStates || []).join(", ");
    }
    if (type === "PEO Partners") {
      return [(org.metadata as any)?.programName, (org.metadata as any)?.verticalsServed].filter(Boolean).join(" · ");
    }
    if (type === "Vendors") {
      return (org.metadata as any)?.category || org.notes || "";
    }
    return "";
  };

  return (
    <GlassCard padding="0">
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {expanded ? <ChevronDown style={{ color: textMuted, width: 18 }} /> : <ChevronRight style={{ color: textMuted, width: 18 }} />}
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: textPrimary }}>{org.name}</p>
            {renderOrgSubtitle() && <p style={{ margin: "2px 0 0", fontSize: "12px", color: textMuted }}>{renderOrgSubtitle()}</p>}
          </div>
        </div>
        <div style={{ padding: "4px 8px", borderRadius: "4px", background: org.status === "Active" ? "rgba(30,233,123,0.1)" : "rgba(0,0,0,0.06)", color: org.status === "Active" ? "#1EE97B" : textMuted, fontSize: "11px", fontWeight: 600 }}>
          {org.status || "Active"}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px 44px", display: "flex", flexDirection: "column", gap: "12px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, paddingTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Contacts</span>
            <button
              onClick={(e) => { e.stopPropagation(); setEditingContact(null); setShowModal(true); }}
              style={{
                background: "var(--accent-primary)", color: "#fff", border: "none", padding: "4px 10px",
                borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
              }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Add Contact
            </button>
          </div>

          {contacts.length === 0 ? (
            <p style={{ fontSize: "13px", color: textMuted, margin: 0 }}>No contacts found.</p>
          ) : (
            [...contacts].sort((a, b) => {
              const roles = roleVocabulary?.[entityType] || [];
              const roleDiff = roles.indexOf(a.role || "") - roles.indexOf(b.role || "");
              return roleDiff || a.lastName.localeCompare(b.lastName);
            }).map((c: any) => (
              <ContactCard
                key={c.id}
                variant="partner_contact"
                name={`${c.firstName} ${c.lastName}`}
                role={c.role}
                email={c.email}
                phoneDirect={c.phone}
                phoneMobile={c.mobile}
                isPrimary={c.isPrimary}
                onEdit={() => { setEditingContact(c); setShowModal(true); }}
              />
            ))
          )}
        </div>
      )}

      {showModal && (
        <ContactModal
          isOpen={true}
          onClose={() => setShowModal(false)}
          entityType={entityType}
          initialData={editingContact}
          onSubmit={(data) => {
            if (editingContact) {
              updateContact.mutate({ id: editingContact.id, data });
            } else {
              createContact.mutate({ ...data, entityType, entityId: org.id });
            }
            setShowModal(false);
          }}
          onDelete={() => {
            if (editingContact) {
              deleteContact.mutate(editingContact.id);
            }
            setShowModal(false);
          }}
        />
      )}
    </GlassCard>
  );
}