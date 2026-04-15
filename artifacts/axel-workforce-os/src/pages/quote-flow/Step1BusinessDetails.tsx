import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, SelectInput, MultiSelect, US_STATES_OPTIONS,
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
        </FieldGrid>
      </FormSection>
    </div>
  );
}
