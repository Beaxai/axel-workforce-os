import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, CurrencyInput,
  YesNoToggle, AddButton, RemoveButton,
} from "@/components/quote-flow/FormFields";
import { AlertCircle } from "lucide-react";
import Hazometer from "@/components/quote-flow/Hazometer";

export default function Step3ExperienceMod() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  const totalPremium = parseFloat(s.totalPremiumPaid?.replace(/[^0-9.]/g, "") || "0");
  const totalClaims = parseFloat(s.totalClaimsPaid?.replace(/[^0-9.]/g, "") || "0");
  const lossRatio = totalPremium > 0 ? ((totalClaims / totalPremium) * 100).toFixed(1) : "0.0";

  const eModValue = parseFloat(s.experienceMod) || 1.0;

  return (
    <div style={{ maxWidth: 800 }}>
      <FormSection
        title="Experience Rating"
        subtitle="If you have an experience modifier, enter it here. If unknown or not applicable, select 1.00."
      >
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 20 }}>
              <FieldLabel label="Does the business have an experience modifier?">
                <YesNoToggle
                  value={s.hasExperienceMod}
                  onChange={(v) => s.update({ hasExperienceMod: v })}
                  options={["Yes", "No", "Unknown"]}
                />
              </FieldLabel>
            </div>

            {s.hasExperienceMod === "Yes" && (
              <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <FieldLabel label="Experience Modifier" required>
                    <TextInput
                      value={s.experienceMod}
                      onChange={(v) => s.update({ experienceMod: v })}
                      placeholder="e.g. 0.85, 1.20"
                    />
                  </FieldLabel>
                </div>
                <div style={{ flex: 1 }}>
                  <FieldLabel label="Effective Date">
                    <TextInput
                      value={s.experienceModDate}
                      onChange={(v) => s.update({ experienceModDate: v })}
                      type="date"
                    />
                  </FieldLabel>
                </div>
              </div>
            )}

            {(s.hasExperienceMod === "No" || s.hasExperienceMod === "Unknown") && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "14px 18px",
                  borderRadius: 10,
                  background: "rgba(233,30,140,0.06)",
                  border: "1px solid rgba(233,30,140,0.15)",
                  marginTop: 16,
                }}
              >
                <AlertCircle style={{ width: 18, height: 18, color: "#E91E8C", flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 14, color: "#ccc", margin: 0, lineHeight: 1.5 }}>
                  We'll use a neutral modifier of <strong style={{ color: textPrimary }}>1.00</strong> for your indication.
                  Final pricing may vary.
                </p>
              </div>
            )}
          </div>

          <div
            style={{
              flexShrink: 0,
              padding: "20px 16px 12px",
              borderRadius: 16,
              background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
            }}
          >
            <Hazometer value={eModValue} />
          </div>
        </div>
      </FormSection>

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
