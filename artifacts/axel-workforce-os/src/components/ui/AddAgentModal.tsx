import { useState } from "react";
import { Modal, PinkButton, GhostButton } from "./axel-index";
import { useAgencies, useCreateAgency, useCreateAgent } from "@/hooks/use-contacts";
import { useThemeStore } from "@/lib/theme-store";
import { useContactRoles } from "@/hooks/use-contact-roles";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const roleLabel = (role: string) => role === "csr" ? "CSR" : role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AddAgentModal({ onClose }: { onClose: () => void }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const { data: agencies = [] } = useAgencies();
  const { data: roleVocabulary } = useContactRoles();
  const createAgency = useCreateAgency();
  const createAgent = useCreateAgent();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [isCreatingAgency, setIsCreatingAgency] = useState(false);
  const [agencyForm, setAgencyForm] = useState({
    legalName: "", dba: "", status: "active", mainPhone: "", website: "",
    address: "", agencyNpn: "", statesLicensed: [] as string[], linesOfAuthority: [] as string[],
  });

  const [agentForm, setAgentForm] = useState({ firstName: "", lastName: "", email: "", title: "", phoneDirect: "", phoneMobile: "", individualNpn: "", licenseStates: [] as string[] });

  const [contacts, setContacts] = useState<any[]>([]);
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", email: "", role: "" });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--input-border)",
    background: "var(--input-bg)", color: "var(--input-text)", fontSize: "14px", outline: "none", boxSizing: "border-box"
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "13px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)", marginBottom: "4px", display: "block"
  };

  const handleNextStep1 = async () => {
    if (isCreatingAgency) {
      if (!agencyForm.legalName || !agencyForm.mainPhone) return;
      createAgency.mutate(agencyForm, {
        onSuccess: (res) => {
          setSelectedAgencyId(res.id);
          setStep(2);
        }
      });
    } else {
      if (!selectedAgencyId) return;
      setStep(2);
    }
  };

  const handleNextStep2 = () => {
    if (!agentForm.firstName || !agentForm.lastName || !agentForm.email) return;
    setStep(3);
  };

  const handleAddContact = () => {
    if (!contactForm.firstName || !contactForm.lastName || !contactForm.email || !contactForm.role) return;
    setContacts([...contacts, contactForm]);
    setContactForm({ firstName: "", lastName: "", email: "", role: "" });
  };

  const handleSubmit = () => {
    const payload = {
      agencyId: selectedAgencyId,
      ...agentForm,
      contacts: contacts.length > 0 ? contacts : undefined
    };
    createAgent.mutate(payload, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Agent Partner">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            <div style={{
              width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600,
              background: step >= s ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              color: step >= s ? "#fff" : isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"
            }}>
              {s}
            </div>
            <div style={{ flex: 1, height: "2px", background: step > s ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, paddingBottom: "12px" }}>
            <button
              onClick={() => setIsCreatingAgency(false)}
              style={{ flex: 1, padding: "8px", background: !isCreatingAgency ? "var(--accent-primary)" : "transparent", color: !isCreatingAgency ? "#fff" : "var(--input-text)", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
            >
              Select Existing
            </button>
            <button
              onClick={() => setIsCreatingAgency(true)}
              style={{ flex: 1, padding: "8px", background: isCreatingAgency ? "var(--accent-primary)" : "transparent", color: isCreatingAgency ? "#fff" : "var(--input-text)", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
            >
              Create New
            </button>
          </div>

          {!isCreatingAgency ? (
            <div>
              <label style={labelStyle}>Select Agency *</label>
              <select value={selectedAgencyId} onChange={e => setSelectedAgencyId(e.target.value)} style={inputStyle}>
                <option value="">Choose an agency...</option>
                {agencies.map((a: any) => <option key={a.id} value={a.id}>{a.legalName}</option>)}
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Legal Name *</label>
                <input value={agencyForm.legalName} onChange={e => setAgencyForm({ ...agencyForm, legalName: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>DBA</label>
                <input value={agencyForm.dba} onChange={e => setAgencyForm({ ...agencyForm, dba: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={agencyForm.status} onChange={e => setAgencyForm({ ...agencyForm, status: e.target.value })} style={inputStyle}>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                 <label style={labelStyle}>Main Phone *</label>
                  <input value={agencyForm.mainPhone} onChange={e => setAgencyForm({ ...agencyForm, mainPhone: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Website</label>
                  <input value={agencyForm.website} onChange={e => setAgencyForm({ ...agencyForm, website: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input value={agencyForm.address} onChange={e => setAgencyForm({ ...agencyForm, address: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Agency NPN</label>
                  <input value={agencyForm.agencyNpn} onChange={e => setAgencyForm({ ...agencyForm, agencyNpn: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Lines of Authority</label>
                  <input
                    value={agencyForm.linesOfAuthority.join(", ")}
                    onChange={e => setAgencyForm({ ...agencyForm, linesOfAuthority: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })}
                    style={inputStyle}
                    placeholder="P&C, Life"
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>States Licensed</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxHeight: "120px", overflowY: "auto", padding: "8px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--input-border)" }}>
                  {US_STATES.map(state => {
                    const selected = agencyForm.statesLicensed.includes(state);
                    return <button type="button" key={state} onClick={() => setAgencyForm({
                      ...agencyForm,
                      statesLicensed: selected ? agencyForm.statesLicensed.filter(value => value !== state) : [...agencyForm.statesLicensed, state],
                    })} style={{ padding: "4px 8px", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "12px", background: selected ? "var(--accent-primary)" : "rgba(128,128,128,0.12)", color: selected ? "#fff" : "var(--input-text)" }}>{state}</button>;
                  })}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
             <PinkButton onClick={handleNextStep1} disabled={isCreatingAgency ? !agencyForm.legalName || !agencyForm.mainPhone : !selectedAgencyId}>Next</PinkButton>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input value={agentForm.firstName} onChange={e => setAgentForm({ ...agentForm, firstName: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input value={agentForm.lastName} onChange={e => setAgentForm({ ...agentForm, lastName: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={agentForm.email} onChange={e => setAgentForm({ ...agentForm, email: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Title</label>
              <input value={agentForm.title} onChange={e => setAgentForm({ ...agentForm, title: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Individual NPN</label>
              <input value={agentForm.individualNpn} onChange={e => setAgentForm({ ...agentForm, individualNpn: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Direct Phone</label>
              <input value={agentForm.phoneDirect} onChange={e => setAgentForm({ ...agentForm, phoneDirect: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mobile Phone</label>
              <input value={agentForm.phoneMobile} onChange={e => setAgentForm({ ...agentForm, phoneMobile: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <GhostButton onClick={() => setStep(1)}>Back</GhostButton>
            <PinkButton onClick={handleNextStep2} disabled={!agentForm.firstName || !agentForm.lastName || !agentForm.email}>Next</PinkButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "14px", color: textMuted, margin: 0 }}>Optionally add other agency staff (like CSAs) for this agency.</p>

          <div style={{ background: "var(--input-bg)", padding: "16px", borderRadius: "8px", border: "1px solid var(--input-border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <input placeholder="First Name" value={contactForm.firstName} onChange={e => setContactForm({ ...contactForm, firstName: e.target.value })} style={{ ...inputStyle, padding: "8px" }} />
              <input placeholder="Last Name" value={contactForm.lastName} onChange={e => setContactForm({ ...contactForm, lastName: e.target.value })} style={{ ...inputStyle, padding: "8px" }} />
              <input placeholder="Email" type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} style={{ ...inputStyle, padding: "8px" }} />
              <select value={contactForm.role} onChange={e => setContactForm({ ...contactForm, role: e.target.value })} style={{ ...inputStyle, padding: "8px" }}>
                <option value="">Select role...</option>
                {(roleVocabulary?.agency || []).map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
              </select>
            </div>
            {contactForm.role === "producer" && (
              <p style={{ fontSize: "12px", color: textMuted, margin: "0 0 8px" }}>
                Producers who refer deals and need platform access are added under Agents, not as contacts.
              </p>
            )}
            <GhostButton onClick={handleAddContact} disabled={!contactForm.firstName || !contactForm.lastName || !contactForm.email || !contactForm.role} style={{ width: "100%", padding: "6px" }}>Add Contact</GhostButton>
          </div>

          {contacts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
              {contacts.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--input-bg)", borderRadius: "6px" }}>
                  <span style={{ fontSize: "13px", color: "var(--input-text)" }}>{c.firstName} {c.lastName} - {c.role || "Staff"}</span>
                  <span style={{ fontSize: "13px", color: textMuted }}>{c.email}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <GhostButton onClick={() => setStep(2)}>Back</GhostButton>
            <PinkButton onClick={handleSubmit}>Finish & Save</PinkButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
