import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldLabel, TextInput, YesNoToggle,
} from "@/components/quote-flow/FormFields";
import { AlertCircle } from "lucide-react";

export default function Step3ExperienceMod() {
  const s = useQuoteFlowStore();

  return (
    <div style={{ maxWidth: 600 }}>
      <FormSection
        title="Experience Rating"
        subtitle="If you have an experience modifier, enter it here. If unknown or not applicable, select 1.00."
      >
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
              We'll use a neutral modifier of <strong style={{ color: "#fff" }}>1.00</strong> for your indication.
              Final pricing may vary.
            </p>
          </div>
        )}
      </FormSection>
    </div>
  );
}
