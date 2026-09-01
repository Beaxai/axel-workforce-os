import { useState, useMemo } from "react";
import { GlassCard, ContactCard, ContactModal } from "./axel-index";
import { ChevronDown, ChevronRight, Plus, Building2 } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from "@/hooks/use-contacts";
import { useContactRoles } from "@/hooks/use-contact-roles";
import { useNavigate } from "react-router-dom";
import { displayName } from "@/lib/agent-display-name";

export function AgencyGroupCard({ agencyId, agencyName, agencyStatus, agents, deals }: { agencyId: string, agencyName: string, agencyStatus: string, agents: any[], deals: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const navigate = useNavigate();
  const { data: agencyContacts = [] } = useContacts("agency", agencyId, expanded);
  const { data: roleVocabulary } = useContactRoles();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  // Calculate deals for this agency (sum of deals for all its agents)
  const activeDeals = deals.filter(d => agents.some(a => a.userId && a.userId === d.producingAgentId) && d.stage !== "Closed Won" && d.stage !== "Closed Lost");
  const wcPremium = deals
    .filter((deal) => agents.some((agent) => agent.userId && agent.userId === deal.producingAgentId))
    .reduce((sum, deal) => sum + Number(deal.wcPremium || deal.estimatedPremium || 0), 0);
  const states = Array.from(new Set(agents.flatMap((agent) => agent.licenseStates || []))).sort();
  const agencyIsActive = agencyStatus?.toLowerCase() === "active";

  return (
    <GlassCard padding="0">
      <div
        id={`agency-${agencyId}`}
        onClick={() => setExpanded(!expanded)}
        style={{ padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {expanded ? <ChevronDown style={{ color: textMuted, width: 18 }} /> : <ChevronRight style={{ color: textMuted, width: 18 }} />}
          <Building2 style={{ color: "var(--accent-primary)", width: 20 }} />
          <div>
             <p style={{ margin: 0, fontWeight: 600, color: textPrimary }}>{agencyName || "Unassigned Agency"}</p>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: textMuted }}>
               {agents.length} agent{agents.length !== 1 && "s"}{states.length > 0 ? ` · ${states.join(", ")}` : ""}
            </p>
             <p style={{ margin: "5px 0 0", fontSize: "11px", color: textMuted }}>
               {activeDeals.length} deals referred · ${wcPremium.toLocaleString()} WC premium
             </p>
          </div>
        </div>
         <div style={{ padding: "4px 8px", borderRadius: "999px", background: agencyIsActive ? "rgba(30,233,123,0.15)" : "rgba(233,195,30,0.15)", color: agencyIsActive ? "#1EE97B" : "#E9C31E", fontSize: "11px", fontWeight: 600 }}>
          {agencyStatus || "Active"}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px 44px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {agents.map(agent => {
            const agentDeals = deals.filter((deal) => agent.userId && deal.producingAgentId === agent.userId);
            const agentPremium = agentDeals.reduce((sum, deal) => sum + Number(deal.wcPremium || deal.estimatedPremium || 0), 0);
            return (
            <ContactCard
              key={agent.id}
              variant="agent"
              name={displayName(agent)}
              subtitle={
                <>
                  {agent.title ? `${agent.title} · ` : ""}
                  <a href={`#agency-${agencyId}`} onClick={(event) => event.stopPropagation()} style={{ color: "#E91E8C", textDecoration: "none" }}>{agencyName}</a>
                </>
              }
              email={agent.email || agent.contactEmail}
              phoneDirect={agent.phoneDirect || agent.contactPhone}
              phoneMobile={agent.phoneMobile}
              status={agent.status}
              footer={<span style={{ fontSize: "11px", color: textMuted }}>{agentDeals.length} deals referred · ${agentPremium.toLocaleString()} WC premium</span>}
              onClick={() => navigate(`/network/agents/${agent.id}`)}
            />
          )})}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Agency contacts</span>
            <button
              onClick={() => { setEditingContact(null); setShowContactModal(true); }}
              style={{ background: "var(--accent-primary)", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Add Contact
            </button>
          </div>
          {agencyContacts.length === 0 ? (
            <p style={{ fontSize: "13px", color: textMuted, margin: 0 }}>No agency contacts yet.</p>
          ) : (
            [...agencyContacts].sort((a, b) => {
              const roles = roleVocabulary?.agency || [];
              return roles.indexOf(a.role || "") - roles.indexOf(b.role || "") || a.lastName.localeCompare(b.lastName);
            }).map((contact) => (
              <ContactCard
                key={contact.id}
                variant="partner_contact"
                name={`${contact.firstName} ${contact.lastName}`}
                title={contact.title}
                role={contact.role}
                email={contact.email}
                phoneDirect={contact.phone}
                phoneMobile={contact.mobile}
                isPrimary={contact.isPrimary}
                onEdit={() => { setEditingContact(contact); setShowContactModal(true); }}
              />
            ))
          )}
        </div>
      )}
      {showContactModal && (
        <ContactModal
          isOpen
          onClose={() => setShowContactModal(false)}
          entityType="agency"
          initialData={editingContact}
          onSubmit={(data) => {
            if (editingContact) updateContact.mutate({ id: editingContact.id, data });
            else createContact.mutate({ ...data, entityType: "agency", entityId: agencyId });
            setShowContactModal(false);
          }}
          onDelete={() => {
            if (editingContact) deleteContact.mutate(editingContact.id);
            setShowContactModal(false);
          }}
        />
      )}
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
                title={c.title}
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
