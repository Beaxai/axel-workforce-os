import { useState, useEffect, useCallback, useMemo } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { FormSection, US_STATES_OPTIONS } from "@/components/quote-flow/FormFields";
import LocationCard from "@/components/quote-flow/LocationCard";
import { api } from "@/lib/api";
import { Users, DollarSign, MapPin, Sparkles, Loader2, X, Search, Plus, Info, Check } from "lucide-react";
import richData from "@/data/rich-class-codes.json";

const RICH: Record<string, { c: string; ico: string; n: string; p: string; d: string; v?: string }> = richData as any;

const VERTICALS = [
  "All",
  "Clerical / Office",
  "Construction",
  "Healthcare",
  "Hospitality",
  "Manufacturing",
  "Transportation",
  "Cannabis",
  "Waste / Recycling",
  "Ambulance",
] as const;

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
  const [codeGridSearch, setCodeGridSearch] = useState("");
  const [activeVertical, setActiveVertical] = useState<string>("All");
  const [showCodeGrid, setShowCodeGrid] = useState(false);
  const [learnMoreEntry, setLearnMoreEntry] = useState<{ c: string; ico: string; n: string; p: string; d: string; v?: string } | null>(null);
  const [validClassCodes, setValidClassCodes] = useState<Set<string> | null>(null);
  const [targetLocationIdx, setTargetLocationIdx] = useState(0);

  const allLocationStates = useMemo(() => {
    const states = new Set<string>();
    for (const loc of s.locations) {
      if (loc.state) states.add(loc.state);
    }
    return Array.from(states).sort().join(",");
  }, [s.locations]);

  useEffect(() => {
    if (!allLocationStates) {
      setValidClassCodes(null);
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
    fetch(`${baseUrl}/wc-rates/class-codes/by-states?states=${encodeURIComponent(allLocationStates)}`)
      .then((res) => res.json())
      .then((codes: string[]) => setValidClassCodes(new Set(codes)))
      .catch(() => setValidClassCodes(null));
  }, [allLocationStates]);

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

  const richEntries = Object.values(RICH);
  const filteredRichEntries = useMemo(() => {
    let entries = richEntries;
    if (validClassCodes) {
      entries = entries.filter((r) => validClassCodes.has(r.c));
    }
    if (activeVertical !== "All") {
      entries = entries.filter((r) => r.v === activeVertical);
    }
    if (codeGridSearch) {
      const q = codeGridSearch.toLowerCase();
      entries = entries.filter(
        (r) =>
          r.c.includes(codeGridSearch) ||
          r.n.toLowerCase().includes(q) ||
          r.p.toLowerCase().includes(q),
      );
    }
    return entries;
  }, [activeVertical, codeGridSearch, validClassCodes]);

  const safeTargetIdx = Math.min(targetLocationIdx, s.locations.length - 1);
  const targetLoc = s.locations[safeTargetIdx] || s.locations[0];

  const addedCodesForTarget = useMemo(() => {
    if (!targetLoc) return new Set<string>();
    const codes = new Set<string>();
    for (const cc of targetLoc.classCodes) {
      if (cc.classCode) codes.add(cc.classCode);
    }
    return codes;
  }, [targetLoc?.id, targetLoc?.classCodes]);

  const addedCodesSet = useMemo(() => {
    const codes = new Set<string>();
    for (const loc of s.locations) {
      for (const cc of loc.classCodes) {
        if (cc.classCode) codes.add(cc.classCode);
      }
    }
    return codes;
  }, [s.locations]);

  const handleApplyRichCard = (entry: typeof richEntries[0]) => {
    if (!targetLoc) return;
    const emptyIdx = targetLoc.classCodes.findIndex((cc) => !cc.classCode);
    if (emptyIdx >= 0) {
      s.updateClassCode(targetLoc.id, emptyIdx, {
        classCode: entry.c,
        description: entry.n,
      });
    } else {
      s.addClassCode(targetLoc.id);
      setTimeout(() => {
        const store = useQuoteFlowStore.getState();
        const loc = store.locations.find((l) => l.id === targetLoc.id);
        if (loc) {
          s.updateClassCode(targetLoc.id, loc.classCodes.length - 1, {
            classCode: entry.c,
            description: entry.n,
          });
        }
      }, 50);
    }
  };

  const handleApplySuggestion = (suggestion: AISuggestion) => {
    if (!targetLoc) return;
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

  const stateFilteredEntries = useMemo(() => {
    if (!validClassCodes) return richEntries;
    return richEntries.filter((r) => validClassCodes.has(r.c));
  }, [validClassCodes]);

  const verticalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of VERTICALS) counts[v] = 0;
    counts["All"] = stateFilteredEntries.length;
    for (const e of stateFilteredEntries) {
      if (e.v && counts[e.v] !== undefined) counts[e.v]++;
    }
    return counts;
  }, [stateFilteredEntries]);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <FormSection
        title="Workforce Profile"
        subtitle="Define your workforce across locations. Add class codes, employee counts, and payroll for each location."
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>
            Locations & Class Codes
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setShowCodeGrid(!showCodeGrid); if (!showCodeGrid) { setCodeGridSearch(""); setActiveVertical("All"); } }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                background: showCodeGrid
                  ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)")
                  : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
                color: textSecondary,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <Search style={{ width: 13, height: 13 }} />
              Browse Codes
            </button>
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

        {showCodeGrid && (
          <div
            style={{
              marginBottom: 20,
              padding: 20,
              borderRadius: 14,
              border: `1px solid ${borderColor}`,
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary, fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Browse & Select Class Codes
              </span>
              <button
                type="button"
                onClick={() => setShowCodeGrid(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: textMuted, display: "flex" }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {s.locations.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: textMuted, whiteSpace: "nowrap", fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Add to:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.locations.map((loc, idx) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setTargetLocationIdx(idx)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 8,
                        border: `1px solid ${safeTargetIdx === idx ? "#E91E8C" : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)")}`,
                        background: safeTargetIdx === idx ? "rgba(233,30,140,0.15)" : "transparent",
                        color: safeTargetIdx === idx ? "#E91E8C" : textSecondary,
                        fontSize: 12,
                        fontWeight: safeTargetIdx === idx ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      Location {idx + 1}{loc.state ? ` (${loc.state})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ position: "relative", marginBottom: 14 }}>
              <Search style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                width: 15, height: 15, color: textMuted, pointerEvents: "none",
              }} />
              <input
                type="text"
                value={codeGridSearch}
                onChange={(e) => setCodeGridSearch(e.target.value)}
                placeholder="Search all codes..."
                style={{
                  width: "100%",
                  padding: "10px 16px 10px 38px",
                  borderRadius: 10,
                  border: `1px solid ${borderColor}`,
                  background: isDark ? "rgba(0,0,0,0.3)" : "#fff",
                  color: textPrimary,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {VERTICALS.filter((v) => v === "All" || verticalCounts[v] > 0).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setActiveVertical(v)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    border: `1px solid ${
                      activeVertical === v
                        ? (isDark ? "rgba(233,30,140,0.5)" : "rgba(233,30,140,0.4)")
                        : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)")
                    }`,
                    background: activeVertical === v
                      ? (isDark ? "rgba(233,30,140,0.15)" : "rgba(233,30,140,0.08)")
                      : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
                    color: activeVertical === v ? "#E91E8C" : textSecondary,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
                maxHeight: 480,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {filteredRichEntries.map((entry) => {
                const isAdded = addedCodesForTarget.has(entry.c);
                return (
                <div
                  key={entry.c}
                  style={{
                    padding: "16px 18px",
                    borderRadius: 12,
                    border: `1px solid ${isAdded ? "rgba(233,30,140,0.4)" : borderColor}`,
                    background: isAdded
                      ? (isDark ? "rgba(233,30,140,0.08)" : "rgba(233,30,140,0.04)")
                      : (isDark ? "rgba(255,255,255,0.03)" : "#fff"),
                    transition: "all 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                  onMouseEnter={(e) => {
                    if (!isAdded) {
                      e.currentTarget.style.borderColor = isDark ? "rgba(233,30,140,0.35)" : "rgba(233,30,140,0.25)";
                      e.currentTarget.style.background = isDark ? "rgba(233,30,140,0.04)" : "rgba(233,30,140,0.02)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAdded) {
                      e.currentTarget.style.borderColor = borderColor;
                      e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "#fff";
                    }
                  }}
                >
                  <div style={{ fontSize: 24, lineHeight: 1 }}>{entry.ico}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E91E8C", lineHeight: 1.2 }}>{entry.c}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, lineHeight: 1.3 }}>
                    {entry.n} {entry.p !== entry.n ? `\u2014 ${entry.p.replace(entry.n, "").replace(/^[\s\-—]+/, "")}` : ""}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: textMuted,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                  }}>
                    {entry.d || entry.p}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {isAdded ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(233,30,140,0.3)",
                          background: "rgba(233,30,140,0.12)",
                          color: "#E91E8C",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        <Check style={{ width: 11, height: 11 }} />
                        Added
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyRichCard(entry)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
                          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                          color: textPrimary,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <Plus style={{ width: 11, height: 11 }} />
                        Add
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLearnMoreEntry(entry)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 12px",
                        borderRadius: 8,
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
                        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                        color: textPrimary,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      Learn more
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            {filteredRichEntries.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: textMuted, fontSize: 13 }}>
                {allLocationStates
                  ? `No class codes match your search${activeVertical !== "All" ? ` in ${activeVertical}` : ""} for ${allLocationStates.replace(/,/g, ", ")}`
                  : "Select a state on a location to see available class codes"}
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
            richMap={RICH}
          />
        ))}

        <button
          type="button"
          onClick={() => s.addLocation()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 12,
            border: `1px dashed ${isDark ? "rgba(233,30,140,0.4)" : "rgba(233,30,140,0.35)"}`,
            background: "transparent",
            color: "#E91E8C",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s",
            width: "100%",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(233,30,140,0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Plus style={{ width: 12, height: 12 }} />
          Add Location
        </button>

        {totalClassCodes > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: textMuted }}>
            {totalClassCodes} class code{totalClassCodes !== 1 ? "s" : ""} across {totalLocations} location{totalLocations !== 1 ? "s" : ""}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
            marginTop: 24,
            paddingTop: 20,
            borderTop: `1px solid ${borderColor}`,
          }}
        >
          {[
            { icon: MapPin, label: "LOCATIONS", value: String(totalLocations) },
            { icon: Users, label: "EMPLOYEES", value: String(totalEmployees) },
            { icon: DollarSign, label: "TOTAL PAYROLL", value: `$${totalPayroll.toLocaleString()}` },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderRadius: 12,
                border: `1px solid ${isDark ? "rgba(233,30,140,0.2)" : "rgba(233,30,140,0.15)"}`,
                background: isDark ? "rgba(233,30,140,0.04)" : "rgba(233,30,140,0.02)",
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
                <item.icon style={{ width: 18, height: 18, color: "#E91E8C" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: textMuted, letterSpacing: 0.5, marginBottom: 2 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary, lineHeight: 1.1 }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

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
            <div style={{ fontSize: 18, fontWeight: 700, color: "#E91E8C", marginBottom: 4 }}>
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
                color: "#E91E8C",
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
              <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.7, marginBottom: 16 }}>
                <strong style={{ color: textPrimary }}>Description:</strong> {learnMoreEntry.d}
              </div>
            )}
            {addedCodesForTarget.has(learnMoreEntry.c) ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "1px solid rgba(233,30,140,0.3)",
                  background: "rgba(233,30,140,0.12)",
                  color: "#E91E8C",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Check style={{ width: 14, height: 14 }} />
                Added
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  handleApplyRichCard(learnMoreEntry);
                  setLearnMoreEntry(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: "#E91E8C",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                Add to Location {safeTargetIdx + 1}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
