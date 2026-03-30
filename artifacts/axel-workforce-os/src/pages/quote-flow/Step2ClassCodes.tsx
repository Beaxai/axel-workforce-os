import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, SelectInput, NumberInput,
  CurrencyInput, AddButton, RemoveButton, US_STATES_OPTIONS,
} from "@/components/quote-flow/FormFields";

const SAMPLE_CLASS_CODES = [
  { value: "0005", label: "0005 - Farm: Nursery Employees" },
  { value: "0008", label: "0008 - Farm: Garden/Florist" },
  { value: "0016", label: "0016 - Farm: Orchard/Vineyard" },
  { value: "0037", label: "0037 - Farm: Cannabis Cultivation" },
  { value: "2585", label: "2585 - Cannabis: Dispensary" },
  { value: "4511", label: "4511 - Cannabis: Delivery" },
  { value: "4720", label: "4720 - Cannabis: Processing" },
  { value: "4829", label: "4829 - Cannabis: Extraction" },
  { value: "8017", label: "8017 - Store: Retail" },
  { value: "8742", label: "8742 - Outside Sales" },
  { value: "8810", label: "8810 - Clerical Office" },
  { value: "9015", label: "9015 - Building Operations" },
];

const CLASS_CODE_DESC: Record<string, string> = {
  "0005": "Farm: Nursery Employees & Drivers",
  "0008": "Farm: Garden Center/Florist Operations",
  "0016": "Farm: Orchard/Vineyard Operations",
  "0037": "Farm: Cannabis Cultivation & Growing",
  "2585": "Cannabis: Retail Dispensary Operations",
  "4511": "Cannabis: Delivery Services",
  "4720": "Cannabis: Processing & Manufacturing",
  "4829": "Cannabis: Extraction Operations",
  "8017": "Store: Retail NOC",
  "8742": "Outside Sales Representatives",
  "8810": "Clerical Office Employees",
  "9015": "Building Operations by Owner",
};

function formatCurrency(n: number): string {
  return n ? n.toLocaleString() : "";
}

function parseCurrency(s: string): number {
  return Number(s.replace(/[^0-9]/g, "")) || 0;
}

export default function Step2ClassCodes() {
  const s = useQuoteFlowStore();

  const stateOptions = s.statesOfOperation.length > 0
    ? s.statesOfOperation.map((st) => ({ value: st, label: st }))
    : s.businessState
      ? [{ value: s.businessState, label: s.businessState }]
      : US_STATES_OPTIONS;

  const totalPayroll = s.getTotalPayroll();
  const totalEmployees = s.getTotalEmployees();

  return (
    <div style={{ maxWidth: 900 }}>
      <FormSection title="Workforce & Payroll" subtitle="Add each class code, payroll, and employee count per location">
        {s.locations.map((loc, locIdx) => (
          <div
            key={loc.id}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: 0 }}>
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
                  gridTemplateColumns: "180px 1fr 80px 80px 140px 36px",
                  gap: 10,
                  alignItems: "end",
                  marginBottom: 10,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(233,30,140,0.15)",
                  background: "rgba(233,30,140,0.02)",
                }}
              >
                <FieldLabel label={ccIdx === 0 ? "Class Code" : ""}>
                  <SelectInput
                    value={cc.classCode}
                    onChange={(v) => {
                      s.updateClassCode(loc.id, ccIdx, {
                        classCode: v,
                        description: CLASS_CODE_DESC[v] || "",
                      });
                    }}
                    options={SAMPLE_CLASS_CODES}
                    placeholder="Code"
                  />
                </FieldLabel>
                <FieldLabel label={ccIdx === 0 ? "Description" : ""}>
                  <TextInput
                    value={cc.description}
                    onChange={(v) => s.updateClassCode(loc.id, ccIdx, { description: v })}
                    placeholder="Description"
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
                Location Payroll: <span style={{ color: "#fff", fontWeight: 600 }}>
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
            <span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{totalEmployees}</span>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#888", display: "block" }}>Total Annual Payroll</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>${totalPayroll.toLocaleString()}</span>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
