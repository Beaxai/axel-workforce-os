import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, TextArea,
  NumberInput, CurrencyInput, YesNoToggle, MultiSelect,
} from "@/components/quote-flow/FormFields";

const EXTRACTION_METHODS = [
  { value: "CO2", label: "CO2" },
  { value: "Butane", label: "Butane" },
  { value: "Isopropyl", label: "Isopropyl" },
  { value: "Ethanol", label: "Ethanol" },
  { value: "Water", label: "Water" },
  { value: "Other", label: "Other" },
];

export default function P2Step6Extraction() {
  const s = useQuoteFlowStore();
  const { isDark, textSecondary, textMuted, cardBg } = useThemeColors();

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <FormSection title="Extraction Operations">
        <FieldLabel label="Extraction Methods">
          <MultiSelect values={s.extractionMethods} onChange={(v) => s.update({ extractionMethods: v })} options={EXTRACTION_METHODS} placeholder="Select methods" />
        </FieldLabel>
        {s.extractionMethods.includes("Other") && (
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Other extraction method (describe)">
              <TextInput
                value={s.extractionMethodsOther}
                onChange={(v) => s.update({ extractionMethodsOther: v })}
                placeholder="e.g., Rosin press, ice water hash"
              />
            </FieldLabel>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Describe Extraction Process">
            <TextArea value={s.extractionProcess} onChange={(v) => s.update({ extractionProcess: v })} placeholder="Describe the process" />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <FieldLabel label="3rd Party Maintenance Agreement?">
            <YesNoToggle value={s.thirdPartyMaintenance} onChange={(v) => s.update({ thirdPartyMaintenance: v })} options={["Yes", "No", "N/A"]} />
          </FieldLabel>
          <FieldLabel label="Extraction Segregated w/ Explosive-Proof Wiring?">
            <YesNoToggle value={s.extractionSegregated} onChange={(v) => s.update({ extractionSegregated: v })} options={["Yes", "No", "N/A"]} />
          </FieldLabel>
          <FieldLabel label="Emergency Relief Valves?">
            <YesNoToggle value={s.emergencyReliefValves} onChange={(v) => s.update({ emergencyReliefValves: v })} options={["Yes", "No", "N/A"]} />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Class C1D1 Booth?">
            <YesNoToggle value={s.classC1D1Booth} onChange={(v) => s.update({ classC1D1Booth: v })} />
          </FieldLabel>
          {s.classC1D1Booth === "No" && (
            <div style={{ marginTop: 8 }}>
              <FieldLabel label="What type?">
                <TextInput value={s.classC1D1BoothType} onChange={(v) => s.update({ classC1D1BoothType: v })} placeholder="Describe type" />
              </FieldLabel>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <FieldLabel label="Extraction Training Provided?">
            <YesNoToggle value={s.extractionTraining} onChange={(v) => s.update({ extractionTraining: v })} options={["Yes", "No", "N/A"]} />
          </FieldLabel>
          <FieldLabel label="Emergency Plan for Toxicity/Fire?">
            <YesNoToggle value={s.emergencyPlan} onChange={(v) => s.update({ emergencyPlan: v })} options={["Yes", "No", "N/A"]} />
          </FieldLabel>
        </div>

        <FieldGrid columns={2}>
          <FieldLabel label="Sq. Footage of Grow Area">
            <NumberInput value={s.growAreaSqft} onChange={(v) => s.update({ growAreaSqft: v })} placeholder="Sq. ft." />
          </FieldLabel>
          <FieldLabel label="Flow Meters or Water Timers?">
            <YesNoToggle value={s.flowMeters} onChange={(v) => s.update({ flowMeters: v })} />
          </FieldLabel>
        </FieldGrid>
      </FormSection>

      <FormSection title="Historical Premiums">
        <div style={{ borderRadius: 12, background: cardBg, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}` }}>
                {["Period", "Year", "Payroll ($)", "Premium ($)", "Sub. Costs ($)"].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: textMuted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.historicalPremiums.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}` }}>
                  <td style={{ padding: "8px 14px", color: textSecondary }}>{row.label}</td>
                  <td style={{ padding: "8px 14px" }}>
                    <TextInput
                      value={row.year}
                      onChange={(v) => {
                        const updated = [...s.historicalPremiums];
                        updated[i] = { ...updated[i], year: v };
                        s.update({ historicalPremiums: updated });
                      }}
                      placeholder="Year"
                      style={{ maxWidth: 80 }}
                    />
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    <CurrencyInput
                      value={row.payroll ? row.payroll.toLocaleString() : ""}
                      onChange={(v) => {
                        const updated = [...s.historicalPremiums];
                        updated[i] = { ...updated[i], payroll: Number(v.replace(/[^0-9]/g, "")) || 0 };
                        s.update({ historicalPremiums: updated });
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    <CurrencyInput
                      value={row.premium ? row.premium.toLocaleString() : ""}
                      onChange={(v) => {
                        const updated = [...s.historicalPremiums];
                        updated[i] = { ...updated[i], premium: Number(v.replace(/[^0-9]/g, "")) || 0 };
                        s.update({ historicalPremiums: updated });
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    <CurrencyInput
                      value={row.subCosts ? row.subCosts.toLocaleString() : ""}
                      onChange={(v) => {
                        const updated = [...s.historicalPremiums];
                        updated[i] = { ...updated[i], subCosts: Number(v.replace(/[^0-9]/g, "")) || 0 };
                        s.update({ historicalPremiums: updated });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>
    </div>
  );
}
