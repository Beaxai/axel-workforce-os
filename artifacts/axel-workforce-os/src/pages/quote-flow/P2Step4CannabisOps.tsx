import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, NumberInput,
  MultiSelect, YesNoToggle, RadioGroup, SelectInput,
} from "@/components/quote-flow/FormFields";

const PAYROLL_FREQUENCY_OPTIONS = [
  { value: "Weekly", label: "Weekly (52 cycles/year)" },
  { value: "BiWeekly", label: "Bi-Weekly (26 cycles/year)" },
  { value: "Monthly", label: "Monthly (12 cycles/year)" },
];

const OPERATIONS_OPTIONS = [
  { value: "Dispensary", label: "Dispensary" },
  { value: "Growing", label: "Growing" },
  { value: "Processing", label: "Processing" },
  { value: "Delivery", label: "Delivery" },
  { value: "Extraction", label: "Extraction" },
];

const CONSUMPTION_METHODS = [
  { value: "Smoked", label: "Smoked" },
  { value: "Vaped", label: "Vaped" },
  { value: "Dabbed", label: "Dabbed" },
  { value: "Edibles", label: "Edibles" },
];

const PAYMENT_METHODS = [
  { value: "Hourly", label: "Hourly" },
  { value: "Commission", label: "Commission" },
  { value: "Salary", label: "Salary" },
  { value: "Other", label: "Other" },
];

const BENEFITS_OPTIONS = [
  { value: "Paid Sick Time", label: "Paid Sick Time" },
  { value: "Paid Vacation", label: "Paid Vacation" },
  { value: "401k", label: "401k" },
  { value: "Retirement", label: "Retirement" },
  { value: "Other", label: "Other" },
];

const PREHIRE_OPTIONS = [
  { value: "Written Application", label: "Written Application" },
  { value: "Pre-Hire MVR", label: "Pre-Hire MVR" },
  { value: "Random Drug Testing", label: "Random Drug Testing" },
  { value: "Physicals", label: "Physicals" },
  { value: "Criminal Background", label: "Criminal Background" },
  { value: "Pre-Hire Drug Testing", label: "Pre-Hire Drug Testing" },
  { value: "Reference Checks", label: "Reference Checks" },
  { value: "Annual MVR", label: "Annual MVR" },
  { value: "Post Accident", label: "Post Accident" },
  { value: "Other", label: "Other" },
];

export default function P2Step4CannabisOps() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <FormSection title="Cannabis Operations">
        <FieldGrid columns={2}>
          <FieldLabel label="Hours of Operation">
            <TextInput value={s.hoursOfOperation} onChange={(v) => s.update({ hoursOfOperation: v })} placeholder="e.g., Mon-Sat 8am-8pm" />
          </FieldLabel>
          <FieldLabel label="Max Employee Concentration Per Shift">
            <NumberInput value={s.maxConcentration} onChange={(v) => s.update({ maxConcentration: v })} placeholder="Number" />
          </FieldLabel>
          <FieldLabel label="Payroll Frequency" required>
            <SelectInput
              value={s.payrollFrequency}
              onChange={(v) => s.update({ payrollFrequency: v })}
              options={PAYROLL_FREQUENCY_OPTIONS}
              placeholder="Select frequency"
            />
          </FieldLabel>
        </FieldGrid>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Operations Include">
            <MultiSelect values={s.cannabisOperations} onChange={(v) => s.update({ cannabisOperations: v })} options={OPERATIONS_OPTIONS} placeholder="Select operations" />
          </FieldLabel>
          <p style={{ marginTop: 6, fontSize: 12, color: textMuted }}>
            Selecting <strong>Extraction</strong> or <strong>Delivery</strong> adds a dedicated questionnaire step to the wizard.
          </p>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, alignItems: "start" }}>
          <FieldLabel label="Cannabis products consumed on-site?">
            <YesNoToggle value={s.consumedOnSite} onChange={(v) => s.update({ consumedOnSite: v })} />
          </FieldLabel>
        </div>

        {s.consumedOnSite === "Yes" && (
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="How are products consumed?">
              <MultiSelect values={s.consumptionMethods} onChange={(v) => s.update({ consumptionMethods: v })} options={CONSUMPTION_METHODS} placeholder="Select methods" />
            </FieldLabel>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>Employee Breakdown</h4>
          <FieldGrid columns={4}>
            <FieldLabel label="Full Time">
              <NumberInput value={s.ftEmployees} onChange={(v) => s.update({ ftEmployees: v })} placeholder="0" />
            </FieldLabel>
            <FieldLabel label="Part Time">
              <NumberInput value={s.ptEmployees} onChange={(v) => s.update({ ptEmployees: v })} placeholder="0" />
            </FieldLabel>
            <FieldLabel label="Seasonal">
              <NumberInput value={s.seasonalEmployees} onChange={(v) => s.update({ seasonalEmployees: v })} placeholder="0" />
            </FieldLabel>
            <FieldLabel label="Volunteers">
              <NumberInput value={s.volunteers} onChange={(v) => s.update({ volunteers: v })} placeholder="0" />
            </FieldLabel>
          </FieldGrid>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="How are employees paid?">
            <MultiSelect values={s.paymentMethods} onChange={(v) => s.update({ paymentMethods: v })} options={PAYMENT_METHODS} placeholder="Select payment methods" />
          </FieldLabel>
          {s.paymentMethods.includes("Other") && (
            <div style={{ marginTop: 12 }}>
              <FieldLabel label="Other payment method (describe)">
                <TextInput
                  value={s.paymentMethodsOther}
                  onChange={(v) => s.update({ paymentMethodsOther: v })}
                  placeholder="e.g., Tips, piecework, profit-sharing"
                />
              </FieldLabel>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Benefits Offered">
            <MultiSelect values={s.benefitsOffered} onChange={(v) => s.update({ benefitsOffered: v })} options={BENEFITS_OPTIONS} placeholder="Select benefits" />
          </FieldLabel>
          {s.benefitsOffered.includes("Other") && (
            <div style={{ marginTop: 12 }}>
              <FieldLabel label="Other benefits (describe)">
                <TextInput
                  value={s.benefitsOfferedOther}
                  onChange={(v) => s.update({ benefitsOfferedOther: v })}
                  placeholder="e.g., Tuition reimbursement, gym membership"
                />
              </FieldLabel>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, alignItems: "start" }}>
          <FieldLabel label="Group Health Coverage?">
            <YesNoToggle value={s.groupHealth} onChange={(v) => s.update({ groupHealth: v })} />
          </FieldLabel>
          {s.groupHealth === "Yes" && (
            <FieldLabel label="% paid by employer">
              <NumberInput value={s.groupHealthPct} onChange={(v) => s.update({ groupHealthPct: v })} placeholder="%" />
            </FieldLabel>
          )}
        </div>
      </FormSection>

      <FormSection title="Pre-Hire & Labor Practices">
        <FieldLabel label="Pre-hire checks">
          <MultiSelect values={s.preHireChecks} onChange={(v) => s.update({ preHireChecks: v })} options={PREHIRE_OPTIONS} placeholder="Select checks" />
        </FieldLabel>
        {s.preHireChecks.includes("Other") && (
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Other pre-hire check (describe)">
              <TextInput
                value={s.preHireChecksOther}
                onChange={(v) => s.update({ preHireChecksOther: v })}
                placeholder="e.g., Social media screening, credit check"
              />
            </FieldLabel>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Return-to-Work available">
            <RadioGroup value={s.returnToWork} onChange={(v) => s.update({ returnToWork: v })} options={["Formal/Written", "Informal/Verbal", "None"]} />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, alignItems: "start" }}>
          <FieldLabel label="Subcontractors used?">
            <YesNoToggle value={s.subcontractorsUsed} onChange={(v) => s.update({ subcontractorsUsed: v })} />
          </FieldLabel>
        </div>

        {s.subcontractorsUsed === "Yes" && (
          <FieldGrid columns={3}>
            <FieldLabel label="% subcontracted">
              <NumberInput value={s.subcontractorPct} onChange={(v) => s.update({ subcontractorPct: v })} placeholder="%" />
            </FieldLabel>
            <FieldLabel label="Types">
              <TextInput value={s.subcontractorTypes} onChange={(v) => s.update({ subcontractorTypes: v })} placeholder="Types of work" />
            </FieldLabel>
            <FieldLabel label="COIs obtained?">
              <YesNoToggle value={s.subcontractorCois} onChange={(v) => s.update({ subcontractorCois: v })} options={["Yes", "No", "N/A"]} />
            </FieldLabel>
          </FieldGrid>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 32, alignItems: "start" }}>
          <FieldLabel label="Day Laborers or Employee Leasing?">
            <YesNoToggle value={s.dayLaborers} onChange={(v) => s.update({ dayLaborers: v })} />
          </FieldLabel>
          <FieldLabel label="Employee Avg Annual Turnover %">
            <NumberInput value={s.avgTurnover} onChange={(v) => s.update({ avgTurnover: v })} placeholder="%" />
          </FieldLabel>
        </div>
      </FormSection>
    </div>
  );
}
