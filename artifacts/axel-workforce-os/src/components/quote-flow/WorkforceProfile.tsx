import { useState, useEffect, useCallback } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { FormSection, AddButton, US_STATES_OPTIONS } from "@/components/quote-flow/FormFields";
import LocationCard from "@/components/quote-flow/LocationCard";
import { api } from "@/lib/api";
import { Users, DollarSign, MapPin, Sparkles, Loader2, X, Search } from "lucide-react";

interface AppetiteResult {
  state: string;
  class_code: string;
  uw_determination: string;
  uw_considerations: string | null;
}

interface AISuggestion {
  classCode: string;
  description: string;
  confidence: number;
  reasoning: string;
}

export default function WorkforceProfile() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  const [appetiteMap, setAppetiteMap] = useState<Record<string, AppetiteResult>>({});
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiState, setAiState] = useState(s.businessState || "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiError, setAiError] = useState("");

  const locationKey = s.locations
    .map((l) => `${l.state}:${l.classCodes.map((c) => c.classCode).join(",")}`)
    .join("|");

  useEffect(() => {
    const lookups: { state: string; class_code: string }[] = [];
    for (const loc of s.locations) {
      if (!loc.state) continue;
      for (const cc of loc.classCodes) {
        if (!cc.classCode) continue;
        lookups.push({ state: loc.state, class_code: cc.classCode });
      }
    }
    if (lookups.length === 0) {
      setAppetiteMap({});
      return;
    }
    api
      .post<{ results: AppetiteResult[] }>("/appetite/batch", { lookups })
      .then((res) => {
        const map: Record<string, AppetiteResult> = {};
        for (const r of res.results) {
          map[`${r.state}:${r.class_code}`] = r;
        }
        setAppetiteMap(map);
      })
      .catch(() => setAppetiteMap({}));
  }, [locationKey]);

  const stateOptions =
    s.statesOfOperation.length > 0
      ? s.statesOfOperation.map((st) => ({ value: st, label: st }))
      : s.businessState
        ? [{ value: s.businessState, label: s.businessState }]
        : US_STATES_OPTIONS;

  const totalPayroll = s.getTotalPayroll();
  const totalEmployees = s.getTotalEmployees();
  const totalLocations = s.locations.length;
  const totalClassCodes = s.locations.reduce((sum, l) => sum + l.classCodes.filter((cc) => cc.classCode).length, 0);

  const handleAiClassify = useCallback(async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiError("");
    setAiSuggestions([]);
    try {
      const res = await api.post<{ success: boolean; data: AISuggestion[] }>("/ai/classify", {
        description: aiQuery,
        state: aiState || undefined,
      });
      setAiSuggestions(res.data);
    } catch (err: any) {
      setAiError("Could not get AI suggestions. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }, [aiQuery, aiState]);

  const handleApplySuggestion = (suggestion: AISuggestion) => {
    if (s.locations.length === 0) return;
    const targetLoc = s.locations[0];
    const emptyIdx = targetLoc.classCodes.findIndex((cc) => !cc.classCode);
    if (emptyIdx >= 0) {
      s.updateClassCode(targetLoc.id, emptyIdx, {
        classCode: suggestion.classCode,
        description: suggestion.description,
      });
    } else {
      s.addClassCode(targetLoc.id);
      setTimeout(() => {
        const store = useQuoteFlowStore.getState();
        const loc = store.locations.find((l) => l.id === targetLoc.id);
        if (loc) {
          s.updateClassCode(targetLoc.id, loc.classCodes.length - 1, {
            classCode: suggestion.classCode,
            description: suggestion.description,
          });
        }
      }, 50);
    }
  };

  const summaryItems = [
    { icon: MapPin, label: "Locations", value: totalLocations },
    { icon: Users, label: "Employees", value: totalEmployees },
    { icon: DollarSign, label: "Total Payroll", value: `$${totalPayroll.toLocaleString()}` },
  ];

  return (
    <div style={{ maxWidth: 960 }}>
      <FormSection
        title="Workforce Profile"
        subtitle="Define your workforce across locations. Add class codes, employee counts, and payroll for each location."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {summaryItems.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderRadius: 12,
                background: isDark ? "rgba(233,30,140,0.04)" : "rgba(233,30,140,0.03)",
                border: `1px solid ${isDark ? "rgba(233,30,140,0.12)" : "rgba(233,30,140,0.1)"}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(233,30,140,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <item.icon style={{ width: 16, height: 16, color: "#E91E8C" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary, lineHeight: 1.2 }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>
            Locations & Class Codes
          </h3>
          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 20,
              border: `1px solid ${isDark ? "rgba(233,30,140,0.25)" : "rgba(233,30,140,0.3)"}`,
              background: aiOpen ? "rgba(233,30,140,0.12)" : "rgba(233,30,140,0.06)",
              color: "#E91E8C",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <Sparkles style={{ width: 13, height: 13 }} />
            AI Class Code Advisor
          </button>
        </div>

        {aiOpen && (
          <div
            style={{
              marginBottom: 20,
              padding: 20,
              borderRadius: 14,
              border: `1px solid ${isDark ? "rgba(233,30,140,0.2)" : "rgba(233,30,140,0.15)"}`,
              background: isDark ? "rgba(233,30,140,0.04)" : "rgba(233,30,140,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles style={{ width: 14, height: 14, color: "#E91E8C" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                  AI Classification Advisor
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAiOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: textMuted, display: "flex" }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: textSecondary, margin: "0 0 14px", lineHeight: 1.5 }}>
              Describe the business operations or job roles and the AI will suggest appropriate NCCI class codes.
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  width: 14, height: 14, color: textMuted, pointerEvents: "none",
                }} />
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiClassify()}
                  placeholder="e.g. Cannabis cultivation with extraction lab and retail dispensary..."
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 34px",
                    borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    background: isDark ? "rgba(0,0,0,0.3)" : "#fff",
                    color: textPrimary,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>
              <select
                value={aiState}
                onChange={(e) => setAiState(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${borderColor}`,
                  background: isDark ? "rgba(0,0,0,0.3)" : "#fff",
                  color: textPrimary,
                  fontSize: 13,
                  outline: "none",
                  minWidth: 80,
                }}
              >
                <option value="">Any State</option>
                {US_STATES_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAiClassify}
                disabled={aiLoading || !aiQuery.trim()}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "#E91E8C",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: aiLoading || !aiQuery.trim() ? "not-allowed" : "pointer",
                  opacity: aiLoading || !aiQuery.trim() ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {aiLoading ? (
                  <>
                    <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                    Classifying...
                  </>
                ) : (
                  "Classify"
                )}
              </button>
            </div>

            {aiError && (
              <div style={{ fontSize: 12, color: "#FF5555", marginBottom: 10 }}>{aiError}</div>
            )}

            {aiSuggestions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {aiSuggestions.map((sg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1px solid ${borderColor}`,
                      background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#E91E8C" }}>{sg.classCode}</span>
                        <span style={{ fontSize: 13, color: textPrimary }}>{sg.description}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: sg.confidence >= 0.8 ? "#00D68F" : sg.confidence >= 0.5 ? "#FFB547" : "#FF5555",
                            background:
                              sg.confidence >= 0.8
                                ? "rgba(0,214,143,0.1)"
                                : sg.confidence >= 0.5
                                  ? "rgba(255,181,71,0.1)"
                                  : "rgba(255,85,85,0.1)",
                            padding: "1px 6px",
                            borderRadius: 8,
                          }}
                        >
                          {Math.round(sg.confidence * 100)}%
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: textMuted, lineHeight: 1.4 }}>{sg.reasoning}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplySuggestion(sg)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: `1px solid ${isDark ? "rgba(233,30,140,0.3)" : "rgba(233,30,140,0.2)"}`,
                        background: "rgba(233,30,140,0.08)",
                        color: "#E91E8C",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        marginLeft: 12,
                      }}
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {s.locations.map((loc, idx) => (
          <LocationCard
            key={loc.id}
            location={loc}
            index={idx}
            canRemove={s.locations.length > 1}
            stateOptions={stateOptions}
            appetiteMap={appetiteMap}
          />
        ))}

        <AddButton label="Add Location" onClick={() => s.addLocation()} />

        {totalClassCodes > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: textMuted }}>
            {totalClassCodes} class code{totalClassCodes !== 1 ? "s" : ""} across {totalLocations} location{totalLocations !== 1 ? "s" : ""}
          </div>
        )}
      </FormSection>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
