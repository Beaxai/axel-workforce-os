import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore, type LocationBlock } from "@/lib/quote-flow-store";
import {
  FieldLabel, TextInput, SelectInput, NumberInput,
  CurrencyInput, AddButton, RemoveButton, US_STATES_OPTIONS,
} from "@/components/quote-flow/FormFields";
import ClassCodeSearch from "@/components/quote-flow/ClassCodeSearch";
import { AppetiteBadge } from "@/components/AppetiteBadge";
import { MapPin, Trash2 } from "lucide-react";

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
  const { isDark, textPrimary, textSecondary, borderColor } = useThemeColors();
  const loc = location;

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
          <MapPin style={{ width: 16, height: 16, color: "#E91E8C" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>
            Location {index + 1}
          </span>
          {loc.state && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#E91E8C",
              background: "rgba(233,30,140,0.1)",
              padding: "2px 8px",
              borderRadius: 10,
            }}>
              {loc.state}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
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
          <FieldLabel label="ZIP">
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
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Class Code</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>FT</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>PT</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Annual Payroll</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Appetite</span>
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
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#E91E8C" }}>{rich.c}</span>
                    <span style={{ fontSize: 11, color: textSecondary, flex: 1 }}>{rich.p}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AddButton label="Add Class Code" onClick={() => s.addClassCode(loc.id)} />
      </div>
    </div>
  );
}
