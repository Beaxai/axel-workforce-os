import { useState } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore, type LocationBlock } from "@/lib/quote-flow-store";
import {
  FieldLabel, TextInput, SelectInput, NumberInput,
  CurrencyInput, AddButton, RemoveButton,
} from "@/components/quote-flow/FormFields";
import ClassCodeSearch from "@/components/quote-flow/ClassCodeSearch";
import { AppetiteBadge } from "@/components/AppetiteBadge";
import { MapPin, Trash2, Info, X } from "lucide-react";

interface AppetiteResult {
  state: string;
  class_code: string;
  uw_determination: string;
  uw_considerations: string | null;
}

interface RichEntry {
  c: string;
  ico: string;
  n: string;
  p: string;
  d: string;
  v?: string;
}

interface LocationCardProps {
  location: LocationBlock;
  index: number;
  canRemove: boolean;
  stateOptions: { value: string; label: string }[];
  appetiteMap: Record<string, AppetiteResult>;
  richMap?: Record<string, RichEntry>;
}

function formatCurrency(n: number): string {
  return n ? n.toLocaleString() : "";
}

function parseCurrency(s: string): number {
  return Number(s.replace(/[^0-9]/g, "")) || 0;
}

export default function LocationCard({ location, index, canRemove, stateOptions, appetiteMap, richMap }: LocationCardProps) {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, borderColor } = useThemeColors();
  const loc = location;
  const [learnMoreEntry, setLearnMoreEntry] = useState<
    { c: string; ico: string; n: string; p: string; d: string; v?: string } | null
  >(null);

  const locPayroll = loc.classCodes.reduce((sum, cc) => sum + (cc.annualPayroll || 0), 0);
  const locEmployees = loc.classCodes.reduce((sum, cc) => sum + (cc.fullTimeEmployees || 0) + (cc.partTimeEmployees || 0), 0);

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 16,
        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          borderBottom: `1px solid ${borderColor}`,
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MapPin style={{ width: 16, height: 16, color: "var(--accent-primary)" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>
            Location {index + 1}
          </span>
          {loc.state && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--accent-primary)",
              background: "rgba(233,30,140,0.1)",
              padding: "2px 8px",
              borderRadius: 10,
            }}>
              {loc.state}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <span style={{ color: textSecondary }}>
              {locEmployees} <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>employees</span>
            </span>
            <span style={{ color: textSecondary }}>
              ${locPayroll.toLocaleString()} <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>payroll</span>
            </span>
          </div>
          {canRemove && (
            <button
              type="button"
              onClick={() => s.removeLocation(loc.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                display: "flex",
              }}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 120px 100px",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <FieldLabel label="Street Address">
            <TextInput
              value={loc.streetAddress || ""}
              onChange={(v) => s.updateLocation(loc.id, { streetAddress: v })}
              placeholder="123 Main St"
            />
          </FieldLabel>
          <FieldLabel label="City">
            <TextInput
              value={loc.city || ""}
              onChange={(v) => s.updateLocation(loc.id, { city: v })}
              placeholder="City"
            />
          </FieldLabel>
          <FieldLabel label="State">
            <SelectInput
              value={loc.state}
              onChange={(v) => s.updateLocation(loc.id, { state: v })}
              options={stateOptions}
              placeholder="State"
            />
          </FieldLabel>
          <FieldLabel label="ZIP" required={loc.state?.toUpperCase() === "CA"}>
            <TextInput
              value={loc.zip || ""}
              onChange={(v) => s.updateLocation(loc.id, { zip: v })}
              placeholder="00000"
            />
          </FieldLabel>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 72px 72px 140px auto 32px",
              gap: 8,
              padding: "0 12px",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)" }}>Class Code</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)" }}>FT</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)" }}>PT</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)" }}>Annual Payroll</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)" }}>Appetite</span>
            <span />
          </div>

          {loc.classCodes.map((cc, ccIdx) => {
            const appetiteKey = loc.state && cc.classCode ? `${loc.state}:${cc.classCode}` : "";
            const appetite = appetiteKey ? appetiteMap[appetiteKey] : undefined;
            const rich = cc.classCode && richMap ? richMap[cc.classCode] : undefined;
            return (
              <div key={ccIdx} style={{ marginBottom: 6 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 72px 72px 140px auto 32px",
                    gap: 8,
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: rich ? "10px 10px 0 0" : 10,
                    border: `1px solid ${isDark ? "rgba(233,30,140,0.12)" : "rgba(233,30,140,0.15)"}`,
                    borderBottom: rich ? "none" : undefined,
                    background: isDark ? "rgba(233,30,140,0.02)" : "rgba(233,30,140,0.02)",
                  }}
                >
                  <ClassCodeSearch
                    value={cc.classCode}
                    description={cc.description}
                    state={loc.state}
                    onChange={(code, desc) => {
                      s.updateClassCode(loc.id, ccIdx, { classCode: code, description: desc });
                    }}
                  />
                  <NumberInput
                    value={cc.fullTimeEmployees ? String(cc.fullTimeEmployees) : ""}
                    onChange={(v) => s.updateClassCode(loc.id, ccIdx, { fullTimeEmployees: Number(v) || 0 })}
                    placeholder="0"
                    min={0}
                  />
                  <NumberInput
                    value={cc.partTimeEmployees ? String(cc.partTimeEmployees) : ""}
                    onChange={(v) => s.updateClassCode(loc.id, ccIdx, { partTimeEmployees: Number(v) || 0 })}
                    placeholder="0"
                    min={0}
                  />
                  <CurrencyInput
                    value={cc.annualPayroll ? formatCurrency(cc.annualPayroll) : ""}
                    onChange={(v) => s.updateClassCode(loc.id, ccIdx, { annualPayroll: parseCurrency(v) })}
                    placeholder="$0"
                  />
                  <div style={{ display: "flex", alignItems: "center", minWidth: 80 }}>
                    {appetite && (
                      <AppetiteBadge
                        determination={appetite.uw_determination}
                        considerations={appetite.uw_considerations}
                        size="sm"
                      />
                    )}
                  </div>
                  <div>
                    {loc.classCodes.length > 1 && (
                      <RemoveButton onClick={() => s.removeClassCode(loc.id, ccIdx)} />
                    )}
                  </div>
                </div>
                {rich && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: "0 0 10px 10px",
                      border: `1px solid ${isDark ? "rgba(233,30,140,0.12)" : "rgba(233,30,140,0.15)"}`,
                      borderTop: "none",
                      background: isDark ? "rgba(233,30,140,0.04)" : "rgba(233,30,140,0.03)",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{rich.ico}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-primary)" }}>{rich.c}</span>
                    <span style={{ fontSize: 11, color: textSecondary, flex: 1 }}>{rich.p}</span>
                    <button
                      type="button"
                      onClick={() => setLearnMoreEntry(rich)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(233,30,140,0.3)",
                        background: "rgba(233,30,140,0.08)",
                        color: "var(--accent-primary)",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontFamily: "var(--app-font-heading)",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(233,30,140,0.16)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(233,30,140,0.08)")}
                    >
                      <Info style={{ width: 11, height: 11 }} />
                      Learn More
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AddButton label="Add Class Code" onClick={() => s.addClassCode(loc.id)} />
      </div>

      {learnMoreEntry && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => setLearnMoreEntry(null)}
        >
          <div
            style={{
              background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.78)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              borderRadius: 16,
              padding: 28,
              maxWidth: 480,
              width: "90%",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
              boxShadow: isDark
                ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"
                : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: 36 }}>{learnMoreEntry.ico}</div>
              <button
                type="button"
                onClick={() => setLearnMoreEntry(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: textMuted, display: "flex" }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-primary)", marginBottom: 4 }}>
              Code {learnMoreEntry.c}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary, marginBottom: 12, lineHeight: 1.4 }}>
              {learnMoreEntry.n}
            </div>
            {learnMoreEntry.v && (
              <div style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--accent-primary)",
                background: "rgba(233,30,140,0.1)",
                padding: "3px 10px",
                borderRadius: 10,
                marginBottom: 12,
              }}>
                {learnMoreEntry.v}
              </div>
            )}
            <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: textPrimary }}>Phraseology:</strong> {learnMoreEntry.p}
            </div>
            {learnMoreEntry.d && learnMoreEntry.d !== learnMoreEntry.p && (
              <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.7 }}>
                <strong style={{ color: textPrimary }}>Description:</strong> {learnMoreEntry.d}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
