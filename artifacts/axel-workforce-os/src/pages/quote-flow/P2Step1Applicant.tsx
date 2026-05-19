import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, SelectInput,
  AddButton, RemoveButton, US_STATES_OPTIONS,
} from "@/components/quote-flow/FormFields";

export default function P2Step1Applicant() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <FormSection title="Additional Details">
        <FieldGrid columns={2}>
          <FieldLabel label="Website">
            <TextInput value={s.website} onChange={(v) => s.update({ website: v })} placeholder="https://" />
          </FieldLabel>
        </FieldGrid>
      </FormSection>

      <FormSection title="Mailing Address">
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }}>
          <div
            style={{
              width: 20, height: 20, borderRadius: 4,
              border: s.mailingAddressSame ? "none" : "2px solid rgba(255,255,255,0.2)",
              background: s.mailingAddressSame ? "#E91E8C" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={() => s.update({ mailingAddressSame: !s.mailingAddressSame })}
          >
            {s.mailingAddressSame && <span style={{ color: textPrimary, fontSize: 14, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 14, color: "#ccc" }}>Same as business address</span>
        </label>
        {!s.mailingAddressSame && (
          <FieldGrid columns={2}>
            <FieldLabel label="Street">
              <TextInput value={s.mailingStreet} onChange={(v) => s.update({ mailingStreet: v })} />
            </FieldLabel>
            <FieldLabel label="Suite">
              <TextInput value={s.mailingSuite} onChange={(v) => s.update({ mailingSuite: v })} />
            </FieldLabel>
            <FieldLabel label="City">
              <TextInput value={s.mailingCity} onChange={(v) => s.update({ mailingCity: v })} />
            </FieldLabel>
            <FieldLabel label="State">
              <SelectInput value={s.mailingState} onChange={(v) => s.update({ mailingState: v })} options={US_STATES_OPTIONS} placeholder="Select state" />
            </FieldLabel>
            <FieldLabel label="Zip">
              <TextInput value={s.mailingZip} onChange={(v) => s.update({ mailingZip: v })} />
            </FieldLabel>
          </FieldGrid>
        )}
      </FormSection>

      <FormSection title="Owners & Officers">
        {s.owners.map((owner, i) => (
          <div
            key={i}
            style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 80px 1fr 80px 36px",
              gap: 10, alignItems: "end", marginBottom: 10, padding: 12, borderRadius: 8,
              border: "1px solid rgba(233,30,140,0.15)", background: "rgba(233,30,140,0.02)",
            }}
          >
            <FieldLabel label={i === 0 ? "First Name" : ""}>
              <TextInput value={owner.firstName} onChange={(v) => s.updateOwner(i, { firstName: v })} placeholder="First" />
            </FieldLabel>
            <FieldLabel label={i === 0 ? "Last Name" : ""}>
              <TextInput value={owner.lastName} onChange={(v) => s.updateOwner(i, { lastName: v })} placeholder="Last" />
            </FieldLabel>
            <FieldLabel label={i === 0 ? "Own %" : ""}>
              <TextInput value={String(owner.ownershipPct || "")} onChange={(v) => s.updateOwner(i, { ownershipPct: Number(v) || 0 })} placeholder="%" />
            </FieldLabel>
            <FieldLabel label={i === 0 ? "Duties" : ""}>
              <TextInput value={owner.duties} onChange={(v) => s.updateOwner(i, { duties: v })} placeholder="Duties" />
            </FieldLabel>
            <FieldLabel label={i === 0 ? "Exc/Inc" : ""}>
              <button
                type="button"
                onClick={() => s.updateOwner(i, { included: !owner.included })}
                style={{
                  padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                  background: owner.included ? "rgba(233,30,140,0.15)" : "transparent",
                  color: owner.included ? "#E91E8C" : "#888", fontSize: 13, cursor: "pointer", width: "100%",
                }}
              >
                {owner.included ? "Inc" : "Exc"}
              </button>
            </FieldLabel>
            <div style={{ paddingBottom: 2 }}>
              <RemoveButton onClick={() => s.removeOwner(i)} />
            </div>
          </div>
        ))}
        {s.owners.length < 6 && (
          <AddButton label="Add Owner / Officer" onClick={() => s.addOwner()} />
        )}
      </FormSection>
    </div>
  );
}
