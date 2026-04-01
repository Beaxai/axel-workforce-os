import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, CurrencyInput,
  YesNoToggle, AddButton, RemoveButton,
} from "@/components/quote-flow/FormFields";

export default function P2Step2CoverageHistory() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  const totalPremium = parseFloat(s.totalPremiumPaid?.replace(/[^0-9.]/g, "") || "0");
  const totalClaims = parseFloat(s.totalClaimsPaid?.replace(/[^0-9.]/g, "") || "0");
  const lossRatio = totalPremium > 0 ? ((totalClaims / totalPremium) * 100).toFixed(1) : "0.0";

  return (
    <div style={{ maxWidth: 800 }}>
      <FormSection title="Prior Coverage">
        <FieldGrid columns={2}>
          <FieldLabel label="Years of Prior WC Coverage">
            <TextInput value={s.yearsOfPriorCoverage} onChange={(v) => s.update({ yearsOfPriorCoverage: v })} placeholder="Number of years" type="number" />
          </FieldLabel>
          <FieldLabel label="Total Premium Paid to Date">
            <CurrencyInput value={s.totalPremiumPaid} onChange={(v) => s.update({ totalPremiumPaid: v })} placeholder="0" />
          </FieldLabel>
          <FieldLabel label="Total Claims Paid to Date">
            <CurrencyInput value={s.totalClaimsPaid} onChange={(v) => s.update({ totalClaimsPaid: v })} placeholder="0" />
          </FieldLabel>
          <FieldLabel label="Loss Ratio">
            <div style={{
              padding: "12px 14px", borderRadius: 10, background: "#1a1a26",
              border: `1px solid ${borderColor}`, color: textPrimary, fontSize: 14,
            }}>
              {lossRatio}%
            </div>
          </FieldLabel>
        </FieldGrid>

        <div style={{ display: "flex", gap: 32, marginTop: 20 }}>
          <FieldLabel label="Non-Renewed?">
            <YesNoToggle value={s.nonRenewed} onChange={(v) => s.update({ nonRenewed: v })} />
          </FieldLabel>
          <div>
            <FieldLabel label="Lapse in Coverage?">
              <YesNoToggle value={s.lapseInCoverage} onChange={(v) => s.update({ lapseInCoverage: v })} />
            </FieldLabel>
            {s.lapseInCoverage === "Yes" && (
              <div style={{ marginTop: 12 }}>
                <FieldLabel label="Date of Lapse">
                  <TextInput value={s.lapseDate} onChange={(v) => s.update({ lapseDate: v })} type="date" />
                </FieldLabel>
              </div>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection title="Prior Policy History" subtitle="Add up to 6 prior policies">
        {s.priorPolicies.map((p, i) => (
          <div
            key={i}
            style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px 80px 120px 36px",
              gap: 10, alignItems: "end", marginBottom: 10, padding: 12, borderRadius: 8,
              border: "1px solid rgba(233,30,140,0.15)", background: "rgba(233,30,140,0.02)",
            }}
          >
            <FieldLabel label={i === 0 ? "Effective" : ""}>
              <TextInput value={p.effectiveDate} onChange={(v) => s.updatePriorPolicy(i, { effectiveDate: v })} type="date" />
            </FieldLabel>
            <FieldLabel label={i === 0 ? "Expiration" : ""}>
              <TextInput value={p.expirationDate} onChange={(v) => s.updatePriorPolicy(i, { expirationDate: v })} type="date" />
            </FieldLabel>
            <FieldLabel label={i === 0 ? "Carrier" : ""}>
              <TextInput value={p.carrier} onChange={(v) => s.updatePriorPolicy(i, { carrier: v })} placeholder="Carrier" />
            </FieldLabel>
            <FieldLabel label={i === 0 ? "Premium" : ""}>
              <CurrencyInput
                value={p.premium ? p.premium.toLocaleString() : ""}
                onChange={(v) => s.updatePriorPolicy(i, { premium: Number(v.replace(/[^0-9]/g, "")) || 0 })}
              />
            </FieldLabel>
            <FieldLabel label={i === 0 ? "Claims" : ""}>
              <TextInput
                value={String(p.claimCount || "")}
                onChange={(v) => s.updatePriorPolicy(i, { claimCount: Number(v) || 0 })}
                placeholder="#"
                type="number"
              />
            </FieldLabel>
            <FieldLabel label={i === 0 ? "Claims Amt" : ""}>
              <CurrencyInput
                value={p.claimsAmount ? p.claimsAmount.toLocaleString() : ""}
                onChange={(v) => s.updatePriorPolicy(i, { claimsAmount: Number(v.replace(/[^0-9]/g, "")) || 0 })}
              />
            </FieldLabel>
            <div style={{ paddingBottom: 2 }}>
              <RemoveButton onClick={() => s.removePriorPolicy(i)} />
            </div>
          </div>
        ))}
        {s.priorPolicies.length < 6 && (
          <AddButton label="Add Prior Policy" onClick={() => s.addPriorPolicy()} />
        )}
      </FormSection>
    </div>
  );
}
