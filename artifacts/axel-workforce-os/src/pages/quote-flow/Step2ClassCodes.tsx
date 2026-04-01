import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldLabel, SelectInput, NumberInput,
  CurrencyInput, AddButton, RemoveButton, US_STATES_OPTIONS,
} from "@/components/quote-flow/FormFields";
import ClassCodeSearch from "@/components/quote-flow/ClassCodeSearch";

function formatCurrency(n: number): string {
  return n ? n.toLocaleString() : "";
}

function parseCurrency(s: string): number {
  return Number(s.replace(/[^0-9]/g, "")) || 0;
}

export default function Step2ClassCodes() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  const stateOptions = s.statesOfOperation.length > 0
    ? s.statesOfOperation.map((st) => ({ value: st, label: st }))
    : s.businessState
      ? [{ value: s.businessState, label: s.businessState }]
      : US_STATES_OPTIONS;

  const totalPayroll = s.getTotalPayroll();
  const totalEmployees = s.getTotalEmployees();

  return (
    <div style={{ maxWidth: 900 }}>
      <FormSection title="Workforce & Payroll" subtitle="Add each class code, payroll, and employee count per location. Search by code number or description.">
        {s.locations.map((loc, locIdx) => (
          <div
            key={loc.id}
            style={{
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: textPrimary, margin: 0 }}>
                Location {locIdx + 1}
              </h4>
              {s.locations.length > 1 && <RemoveButton onClick={() => s.removeLocation(loc.id)} />}
            </div>

            <div style={{ marginBottom: 16, maxWidth: 240 }}>
              <FieldLabel label="State">
                <SelectInput
                  value={loc.state}
                  onChange={(v) => s.updateLocation(loc.id, { state: v })}
                  options={stateOptions}
                  placeholder="Select state"
                />
              </FieldLabel>
            </div>

            {loc.classCodes.map((cc, ccIdx) => (
              <div
                key={ccIdx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px 140px 36px",
                  gap: 10,
                  alignItems: "end",
                  marginBottom: 10,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(233,30,140,0.15)",
                  background: "rgba(233,30,140,0.02)",
                }}
              >
                <FieldLabel label={ccIdx === 0 ? "Class Code (search by code or description)" : ""}>
                  <ClassCodeSearch
                    value={cc.classCode}
                    description={cc.description}
                    onChange={(code, desc) => {
                      s.updateClassCode(loc.id, ccIdx, {
                        classCode: code,
                        description: desc,
                      });
                    }}
                  />
                </FieldLabel>
                <FieldLabel label={ccIdx === 0 ? "FT" : ""}>
                  <NumberInput
                    value={cc.fullTimeEmployees ? String(cc.fullTimeEmployees) : ""}
                    onChange={(v) => s.updateClassCode(loc.id, ccIdx, { fullTimeEmployees: Number(v) || 0 })}
                    placeholder="0"
                    min={0}
                  />
                </FieldLabel>
                <FieldLabel label={ccIdx === 0 ? "PT" : ""}>
                  <NumberInput
                    value={cc.partTimeEmployees ? String(cc.partTimeEmployees) : ""}
                    onChange={(v) => s.updateClassCode(loc.id, ccIdx, { partTimeEmployees: Number(v) || 0 })}
                    placeholder="0"
                    min={0}
                  />
                </FieldLabel>
                <FieldLabel label={ccIdx === 0 ? "Annual Payroll" : ""}>
                  <CurrencyInput
                    value={cc.annualPayroll ? formatCurrency(cc.annualPayroll) : ""}
                    onChange={(v) => s.updateClassCode(loc.id, ccIdx, { annualPayroll: parseCurrency(v) })}
                    placeholder="0"
                  />
                </FieldLabel>
                <div style={{ paddingBottom: 2 }}>
                  {loc.classCodes.length > 1 && (
                    <RemoveButton onClick={() => s.removeClassCode(loc.id, ccIdx)} />
                  )}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <AddButton label="Add Class Code" onClick={() => s.addClassCode(loc.id)} />
              <span style={{ fontSize: 13, color: "#888" }}>
                Location Payroll: <span style={{ color: textPrimary, fontWeight: 600 }}>
                  ${loc.classCodes.reduce((s, cc) => s + (cc.annualPayroll || 0), 0).toLocaleString()}
                </span>
              </span>
            </div>
          </div>
        ))}

        <AddButton label="Add Location" onClick={() => s.addLocation()} />

        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 24,
            padding: "16px 20px",
            borderRadius: 10,
            background: "rgba(233,30,140,0.06)",
            border: "1px solid rgba(233,30,140,0.15)",
          }}
        >
          <div>
            <span style={{ fontSize: 12, color: "#888", display: "block" }}>Total Employees</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: textPrimary }}>{totalEmployees}</span>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#888", display: "block" }}>Total Annual Payroll</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: textPrimary }}>${totalPayroll.toLocaleString()}</span>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
