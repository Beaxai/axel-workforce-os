import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, SelectInput, MultiSelect, US_STATES_OPTIONS,
  AddButton, RemoveButton,
} from "@/components/quote-flow/FormFields";

const ENTITY_TYPES = [
  { value: "LLC", label: "LLC" },
  { value: "Corporation", label: "Corporation" },
  { value: "Sole Proprietorship", label: "Sole Proprietorship" },
  { value: "Partnership", label: "Partnership" },
  { value: "S-Corp", label: "S-Corp" },
];

const YEARS_OPTIONS = [
  { value: "<1", label: "Less than 1 year" },
  { value: "1-2", label: "1-2 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "6-10", label: "6-10 years" },
  { value: "10+", label: "10+ years" },
];

const LOCATION_COUNT_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

export default function Step1BusinessDetails() {
  const s = useQuoteFlowStore();
  const { textPrimary } = useThemeColors();

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <FormSection title="Tell us about the business">
        <FieldGrid columns={2}>
          <FieldLabel label="Legal Business Name" required>
            <TextInput value={s.businessName} onChange={(v) => s.update({ businessName: v })} placeholder="Enter business name" />
          </FieldLabel>
          <FieldLabel label="DBA">
            <TextInput value={s.dba} onChange={(v) => s.update({ dba: v })} placeholder="Doing business as" />
          </FieldLabel>
          <FieldLabel label="FEIN / Tax ID" required>
            <TextInput value={s.fein} onChange={(v) => s.update({ fein: v })} placeholder="XX-XXXXXXX" />
          </FieldLabel>
          <FieldLabel label="Entity Type" required>
            <SelectInput value={s.entityType} onChange={(v) => s.update({ entityType: v })} options={ENTITY_TYPES} placeholder="Select entity type" />
          </FieldLabel>
          <FieldLabel label="Years in Business" required>
            <SelectInput value={s.yearsInBusiness} onChange={(v) => s.update({ yearsInBusiness: v })} options={YEARS_OPTIONS} placeholder="Select..." />
          </FieldLabel>
          <FieldLabel label="Business State" required>
            <SelectInput value={s.businessState} onChange={(v) => s.update({ businessState: v })} options={US_STATES_OPTIONS} placeholder="Primary state" />
          </FieldLabel>
        </FieldGrid>
      </FormSection>

      <FormSection title="Primary Location Address" subtitle="This will be used as your first location for the workforce profile.">
        <FieldGrid columns={1}>
          <FieldLabel label="Street Address" required>
            <TextInput value={s.primaryStreetAddress} onChange={(v) => s.updatePrimaryAddress({ primaryStreetAddress: v })} placeholder="123 Main Street" />
          </FieldLabel>
        </FieldGrid>
        <FieldGrid columns={3}>
          <FieldLabel label="City" required>
            <TextInput value={s.primaryCity} onChange={(v) => s.updatePrimaryAddress({ primaryCity: v })} placeholder="City" />
          </FieldLabel>
          <FieldLabel label="State" required>
            <SelectInput value={s.primaryState} onChange={(v) => s.updatePrimaryAddress({ primaryState: v })} options={US_STATES_OPTIONS} placeholder="State" />
          </FieldLabel>
          <FieldLabel label="ZIP Code" required>
            <TextInput value={s.primaryZip} onChange={(v) => s.updatePrimaryAddress({ primaryZip: v })} placeholder="ZIP" />
          </FieldLabel>
        </FieldGrid>

        <div style={{ marginTop: 16 }}>
          <FieldGrid columns={2}>
            <FieldLabel label="How many locations?" required>
              <SelectInput
                value={s.locationCount}
                onChange={(v) => s.setLocationCount(Number(v))}
                options={LOCATION_COUNT_OPTIONS}
                placeholder="Select..."
              />
            </FieldLabel>
          </FieldGrid>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="States of Operation">
            <MultiSelect values={s.statesOfOperation} onChange={(v) => s.update({ statesOfOperation: v })} options={US_STATES_OPTIONS} placeholder="Select operating states" />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#ccc", margin: 0, marginBottom: 12, fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Mailing Address
          </h4>
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
        </div>
      </FormSection>

      <FormSection title="Primary Contact">
        <FieldGrid columns={2}>
          <FieldLabel label="Contact Name" required>
            <TextInput value={s.contactName} onChange={(v) => s.update({ contactName: v })} placeholder="Full name" />
          </FieldLabel>
          <FieldLabel label="Contact Email" required>
            <TextInput value={s.contactEmail} onChange={(v) => s.update({ contactEmail: v })} placeholder="email@example.com" type="email" />
          </FieldLabel>
          <FieldLabel label="Contact Phone" required>
            <TextInput value={s.contactPhone} onChange={(v) => s.update({ contactPhone: v })} placeholder="(555) 555-5555" />
          </FieldLabel>
          <FieldLabel label="Website">
            <TextInput value={s.website} onChange={(v) => s.update({ website: v })} placeholder="https://" />
          </FieldLabel>
        </FieldGrid>
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
