import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, TextArea,
  YesNoToggle, RadioGroup, MultiSelect,
} from "@/components/quote-flow/FormFields";

const LIFTING_CONTROLS = [
  { value: "Handtrucks", label: "Handtrucks" },
  { value: "Forklifts", label: "Forklifts" },
  { value: "2-person lifts", label: "2-person lifts" },
  { value: "N/A", label: "N/A" },
  { value: "Other", label: "Other" },
];

const HEIGHT_EQUIPMENT = [
  { value: "Scissor Lift", label: "Scissor Lift" },
  { value: "Scaffolding", label: "Scaffolding" },
  { value: "Bucket Truck", label: "Bucket Truck" },
  { value: "Ladder", label: "Ladder" },
];

const FALL_PROTECTION = [
  { value: "Fall Arrest", label: "Fall Arrest" },
  { value: "Positioning", label: "Positioning" },
  { value: "Retrieval", label: "Retrieval" },
  { value: "Suspension", label: "Suspension" },
];

const PPE_OPTIONS = [
  "Gloves", "Back Belts", "Ear Plugs", "Goggles", "Masks",
  "Hard Hats", "Safety Glasses", "Steel Toed Boots",
  "Respirator", "Non-Slip Shoes", "Protective Clothing", "Other",
].map((v) => ({ value: v, label: v }));

const SECURITY_OPTIONS = [
  "Interior Cameras", "Exterior Cameras", "Metal Detector",
  "Panic Button", "Gated Doors", "Gated Windows",
  "Central Station Burglar Alarm", "Metal Doors",
  "Central Station Fire Alarm", "Security Vestibule/Mantrap",
  "Door Intercom", "Other",
].map((v) => ({ value: v, label: v }));

export default function P2Step5SafetyPremises() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <FormSection title="Safety Program">
        <FieldGrid columns={2}>
          <FieldLabel label="Safety Program">
            <RadioGroup value={s.safetyProgram} onChange={(v) => s.update({ safetyProgram: v })} options={["Formal/Written", "Informal/Verbal", "None"]} />
          </FieldLabel>
          <FieldLabel label="Safety Training">
            <RadioGroup value={s.safetyTraining} onChange={(v) => s.update({ safetyTraining: v })} options={["Yes Documented", "Yes Verbal", "None"]} />
          </FieldLabel>
        </FieldGrid>

        <div style={{ marginTop: 16, display: "flex", gap: 32, alignItems: "start", flexWrap: "wrap" }}>
          <FieldLabel label="Safety Meetings?">
            <YesNoToggle value={s.safetyMeetings} onChange={(v) => s.update({ safetyMeetings: v })} />
          </FieldLabel>
          {s.safetyMeetings === "Yes" && (
            <FieldLabel label="Frequency">
              <RadioGroup value={s.safetyMeetingFreq} onChange={(v) => s.update({ safetyMeetingFreq: v })} options={["Weekly", "Monthly", "Quarterly", "Annually"]} />
            </FieldLabel>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <FieldLabel label="Accident investigations for all injuries?">
            <YesNoToggle value={s.accidentInvestigations} onChange={(v) => s.update({ accidentInvestigations: v })} />
          </FieldLabel>
          <FieldLabel label="MSDS Program?">
            <YesNoToggle value={s.msdsProgram} onChange={(v) => s.update({ msdsProgram: v })} />
          </FieldLabel>
          <FieldLabel label="Respiratory Program?">
            <YesNoToggle value={s.respiratoryProgram} onChange={(v) => s.update({ respiratoryProgram: v })} />
          </FieldLabel>
          <FieldLabel label="Building Ventilated?">
            <YesNoToggle value={s.buildingVentilated} onChange={(v) => s.update({ buildingVentilated: v })} />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Chemicals used — list">
            <TextInput
              value={s.chemicalsUsed}
              onChange={(v) => s.update({ chemicalsUsed: v })}
              placeholder="List chemicals"
              disabled={s.chemicalsNotApplicable}
            />
          </FieldLabel>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer" }}>
            <div
              onClick={() => s.update({ chemicalsNotApplicable: !s.chemicalsNotApplicable })}
              style={{
                width: 18, height: 18, borderRadius: 4,
                border: s.chemicalsNotApplicable ? "none" : "2px solid rgba(255,255,255,0.2)",
                background: s.chemicalsNotApplicable ? "#E91E8C" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {s.chemicalsNotApplicable && <span style={{ color: textPrimary, fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: "#ccc" }}>Not applicable / no chemicals used</span>
          </label>
        </div>
      </FormSection>

      <FormSection title="Physical Hazards">
        <FieldGrid columns={2}>
          <FieldLabel label="Lifting Exposures">
            <RadioGroup value={s.liftingExposures} onChange={(v) => s.update({ liftingExposures: v })} options={["<25lbs", "25-40lbs", "40+lbs", "N/A"]} />
          </FieldLabel>
          <FieldLabel label="Lifting Controls">
            <MultiSelect values={s.liftingControls} onChange={(v) => s.update({ liftingControls: v })} options={LIFTING_CONTROLS} placeholder="Select controls" />
          </FieldLabel>
        </FieldGrid>

        <div style={{ marginTop: 16, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <FieldLabel label="Machinery Guarded & Maintained?">
            <YesNoToggle value={s.machineryGuarded} onChange={(v) => s.update({ machineryGuarded: v })} options={["Yes", "No", "N/A"]} />
          </FieldLabel>
          <FieldLabel label="Lockout/Tagout?">
            <YesNoToggle value={s.lockoutTagout} onChange={(v) => s.update({ lockoutTagout: v })} options={["Yes", "No", "N/A"]} />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Forklifts Used?">
            <YesNoToggle value={s.forkliftsUsed} onChange={(v) => s.update({ forkliftsUsed: v })} />
          </FieldLabel>
          {s.forkliftsUsed === "Yes" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer" }}>
              <div
                onClick={() => s.update({ forkliftsCertified: !s.forkliftsCertified })}
                style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: s.forkliftsCertified ? "none" : "2px solid rgba(255,255,255,0.2)",
                  background: s.forkliftsCertified ? "#E91E8C" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {s.forkliftsCertified && <span style={{ color: textPrimary, fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: "#ccc" }}>Operators annually certified</span>
            </label>
          )}
        </div>

        <FieldGrid columns={2}>
          <FieldLabel label="Maximum Height %">
            <RadioGroup value={s.maxHeight} onChange={(v) => s.update({ maxHeight: v })} options={["0-6 ft", "7-15 ft", "15+ ft", "N/A"]} />
          </FieldLabel>
          <FieldLabel label="Maximum Depth">
            <RadioGroup value={s.maxDepth} onChange={(v) => s.update({ maxDepth: v })} options={["0-3 ft", "4-7 ft", "8+ ft", "N/A"]} />
          </FieldLabel>
        </FieldGrid>

        {(s.maxHeight === "7-15 ft" || s.maxHeight === "15+ ft") && (
          <div style={{ marginTop: 16 }}>
            <FieldLabel label="If heights, what equipment is used?">
              <MultiSelect values={s.heightEquipment} onChange={(v) => s.update({ heightEquipment: v })} options={HEIGHT_EQUIPMENT} />
            </FieldLabel>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Fall Protection Types">
            <MultiSelect values={s.fallProtection} onChange={(v) => s.update({ fallProtection: v })} options={FALL_PROTECTION} placeholder="Select types" />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="COVID-19 Safety Measures">
            <TextArea value={s.covidMeasures} onChange={(v) => s.update({ covidMeasures: v })} placeholder="Describe measures taken" />
          </FieldLabel>
        </div>
      </FormSection>

      <FormSection title="PPE & Security">
        <FieldLabel label="PPE Used">
          <MultiSelect values={s.ppeUsed} onChange={(v) => s.update({ ppeUsed: v })} options={PPE_OPTIONS} placeholder="Select PPE" />
        </FieldLabel>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Security Systems">
            <MultiSelect values={s.securitySystems} onChange={(v) => s.update({ securitySystems: v })} options={SECURITY_OPTIONS} placeholder="Select systems" />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <FieldLabel label="Written Security Plan?">
            <YesNoToggle value={s.writtenSecurityPlan} onChange={(v) => s.update({ writtenSecurityPlan: v })} />
          </FieldLabel>
          <FieldLabel label="Security Guards">
            <YesNoToggle value={s.securityGuards} onChange={(v) => s.update({ securityGuards: v })} options={["Insured's Employees", "Outside Firm", "N/A"]} />
          </FieldLabel>
          <FieldLabel label="Security Guards Armed?">
            <YesNoToggle value={s.securityGuardsArmed} onChange={(v) => s.update({ securityGuardsArmed: v })} options={["Yes", "No", "N/A"]} />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Outside Security Company?">
            <YesNoToggle value={s.outsideSecurityCompany} onChange={(v) => s.update({ outsideSecurityCompany: v })} />
          </FieldLabel>
          {s.outsideSecurityCompany === "Yes" && (
            <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div
                  onClick={() => s.update({ outsideSecurityCois: !s.outsideSecurityCois })}
                  style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: s.outsideSecurityCois ? "none" : "2px solid rgba(255,255,255,0.2)",
                    background: s.outsideSecurityCois ? "#E91E8C" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {s.outsideSecurityCois && <span style={{ color: textPrimary, fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: "#ccc" }}>COIs Obtained</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div
                  onClick={() => s.update({ outsideSecurityAdditionalInsured: !s.outsideSecurityAdditionalInsured })}
                  style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: s.outsideSecurityAdditionalInsured ? "none" : "2px solid rgba(255,255,255,0.2)",
                    background: s.outsideSecurityAdditionalInsured ? "#E91E8C" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {s.outsideSecurityAdditionalInsured && <span style={{ color: textPrimary, fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: "#ccc" }}>Named as Additional Insured</span>
              </label>
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}
