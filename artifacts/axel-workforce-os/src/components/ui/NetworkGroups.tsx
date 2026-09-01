import { useState, useMemo } from "react";
import { GlassCard, ContactCard, ContactModal, Modal } from "./axel-index";
import { ChevronDown, ChevronRight, Plus, Building2, Edit2, ExternalLink, Phone, MapPin, ShieldCheck } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, useUpdateAgency } from "@/hooks/use-contacts";
import { useContactRoles } from "@/hooks/use-contact-roles";
import { useNavigate } from "react-router-dom";
import { displayName } from "@/lib/agent-display-name";
import { useAuthStore } from "@/lib/auth-store";
import { agencyEoStatus, agencyRegistrationStatus } from "@/lib/agency-registration-status";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export function AgencyGroupCard({ agency, agencyId, agencyName, agencyStatus, agents, deals }: { agency?: any, agencyId: string, agencyName: string, agencyStatus: string, agents: any[], deals: any[] }) {
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
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [agencyForm, setAgencyForm] = useState<any>(null);
  const updateAgency = useUpdateAgency();
  const { user } = useAuthStore();
  const canEditAgency = agency && (user?.role === "ADMIN" || user?.role === "CSA");

  // Calculate deals for this agency (sum of deals for all its agents)
  const activeDeals = deals.filter(d => agents.some(a => a.userId && a.userId === d.producingAgentId) && d.stage !== "Closed Won" && d.stage !== "Closed Lost");
  const wcPremium = deals
    .filter((deal) => agents.some((agent) => agent.userId && agent.userId === deal.producingAgentId))
    .reduce((sum, deal) => sum + Number(deal.wcPremium || deal.estimatedPremium || 0), 0);
  const states = Array.isArray(agency?.statesLicensed) ? agency.statesLicensed : [];
  const agencyIsActive = agencyStatus?.toLowerCase() === "active";
  const registrationStatus = agencyRegistrationStatus(agency?.registration);
  const eoStatus = agencyEoStatus(agency?.registration);

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
                {agency?.dba ? `DBA ${agency.dba} · ` : ""}{agents.length} agent{agents.length !== 1 && "s"}
            </p>
              {(agency?.mainPhone || agency?.website || agency?.address || agency?.agencyNpn) && (
               <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: "6px", fontSize: "12px", color: textMuted }}>
                 {agency.mainPhone && <a href={`tel:${agency.mainPhone}`} onClick={event => event.stopPropagation()} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}><Phone style={{ width: 12 }} />{agency.mainPhone}</a>}
                 {agency.website && <a href={/^https?:\/\//i.test(agency.website) ? agency.website : `https://${agency.website}`} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} style={{ color: "#E91E8C", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>{agency.website}<ExternalLink style={{ width: 12 }} /></a>}
                  {agency.address && <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><MapPin style={{ width: 12 }} />{agency.address}</span>}
                 {agency.agencyNpn && <span>NPN {agency.agencyNpn}</span>}
               </div>
             )}
             {states.length > 0 && (
               <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                 {states.map((state: string) => <span key={state} style={{ padding: "2px 7px", borderRadius: "999px", fontSize: "10px", fontWeight: 600, color: textPrimary, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)" }}>{state}</span>)}
               </div>
             )}
              {Array.isArray(agency?.linesOfAuthority) && agency.linesOfAuthority.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", marginTop: "6px", fontSize: "11px", color: textMuted }}>
                  <ShieldCheck style={{ width: 12 }} />
                  {agency.linesOfAuthority.join(" · ")}
                </div>
              )}
             <p style={{ margin: "5px 0 0", fontSize: "11px", color: textMuted }}>
               {activeDeals.length} deals referred · ${wcPremium.toLocaleString()} WC premium
             </p>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                <span style={{
                  padding: "3px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 600,
                  color: registrationStatus.color === "green" ? "#1EE97B" : registrationStatus.color === "yellow" ? "#E9C31E" : textMuted,
                  background: registrationStatus.color === "green" ? "rgba(30,233,123,0.12)" : registrationStatus.color === "yellow" ? "rgba(233,195,30,0.12)" : "rgba(128,128,128,0.12)",
                }}>
                  {registrationStatus.label}
                </span>
                {eoStatus && <span style={{ fontSize: "11px", color: eoStatus.color, fontWeight: 600 }}>{eoStatus.label}</span>}
              </div>
          </div>
        </div>
         <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
           {canEditAgency && <button onClick={(event) => {
             event.stopPropagation();
             setAgencyForm({
               legalName: agency.legalName || "", dba: agency.dba || "", status: agency.status || "pending",
               mainPhone: agency.mainPhone || "", website: agency.website || "", address: agency.address || "",
               agencyNpn: agency.agencyNpn || "", statesLicensed: Array.isArray(agency.statesLicensed) ? agency.statesLicensed : [],
               linesOfAuthority: Array.isArray(agency.linesOfAuthority) ? agency.linesOfAuthority : [],
             });
             setShowAgencyModal(true);
           }} style={{ border: "none", background: "transparent", color: "#E91E8C", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600 }}><Edit2 style={{ width: 14 }} /> Edit</button>}
           <div style={{ padding: "4px 8px", borderRadius: "999px", background: agencyIsActive ? "rgba(30,233,123,0.15)" : "rgba(233,195,30,0.15)", color: agencyIsActive ? "#1EE97B" : "#E9C31E", fontSize: "11px", fontWeight: 600 }}>
             {agencyStatus || "Active"}
           </div>
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
      {showAgencyModal && agencyForm && (
        <Modal isOpen onClose={() => setShowAgencyModal(false)} title="Edit Agency">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <AgencyField label="Legal Name *"><input value={agencyForm.legalName} onChange={event => setAgencyForm({ ...agencyForm, legalName: event.target.value })} style={agencyInputStyle} /></AgencyField>
            <AgencyField label="DBA"><input value={agencyForm.dba} onChange={event => setAgencyForm({ ...agencyForm, dba: event.target.value })} style={agencyInputStyle} /></AgencyField>
            <AgencyField label="Status"><select value={agencyForm.status} onChange={event => setAgencyForm({ ...agencyForm, status: event.target.value })} style={agencyInputStyle}><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="terminated">Terminated</option></select></AgencyField>
            <AgencyField label="Main Phone"><input value={agencyForm.mainPhone} onChange={event => setAgencyForm({ ...agencyForm, mainPhone: event.target.value })} style={agencyInputStyle} /></AgencyField>
            <AgencyField label="Website"><input value={agencyForm.website} onChange={event => setAgencyForm({ ...agencyForm, website: event.target.value })} style={agencyInputStyle} /></AgencyField>
            <AgencyField label="Address"><input value={agencyForm.address} onChange={event => setAgencyForm({ ...agencyForm, address: event.target.value })} style={agencyInputStyle} /></AgencyField>
            <AgencyField label="Agency NPN"><input value={agencyForm.agencyNpn} onChange={event => setAgencyForm({ ...agencyForm, agencyNpn: event.target.value })} style={agencyInputStyle} /></AgencyField>
            <AgencyField label="States Licensed">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxHeight: "110px", overflowY: "auto", padding: "8px", border: "1px solid var(--input-border)", borderRadius: "8px" }}>
                {US_STATES.map(state => {
                  const selected = agencyForm.statesLicensed.includes(state);
                  return <button type="button" key={state} onClick={() => setAgencyForm({ ...agencyForm, statesLicensed: selected ? agencyForm.statesLicensed.filter((value: string) => value !== state) : [...agencyForm.statesLicensed, state] })} style={{ padding: "4px 8px", borderRadius: "4px", border: "none", cursor: "pointer", background: selected ? "var(--accent-primary)" : "rgba(128,128,128,0.12)", color: selected ? "#fff" : "var(--input-text)" }}>{state}</button>;
                })}
              </div>
            </AgencyField>
            <AgencyField label="Lines of Authority"><input value={agencyForm.linesOfAuthority.join(", ")} onChange={event => setAgencyForm({ ...agencyForm, linesOfAuthority: event.target.value.split(",").map(value => value.trim()).filter(Boolean) })} style={agencyInputStyle} placeholder="P&C, Life" /></AgencyField>
            <button
              disabled={!agencyForm.legalName.trim() || updateAgency.isPending}
              onClick={() => updateAgency.mutate({ id: agencyId, data: agencyForm }, { onSuccess: () => setShowAgencyModal(false) })}
              style={{ marginTop: "8px", border: "none", borderRadius: "8px", padding: "10px 16px", background: "#E91E8C", color: "#fff", cursor: "pointer", fontWeight: 600, opacity: !agencyForm.legalName.trim() || updateAgency.isPending ? 0.55 : 1 }}
            >{updateAgency.isPending ? "Saving..." : "Save Agency"}</button>
          </div>
        </Modal>
      )}
    </GlassCard>
  );
}

const agencyInputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: "8px",
  border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--input-text)",
  fontSize: "14px", outline: "none",
};

function AgencyField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>{label}</label>{children}</div>;
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
