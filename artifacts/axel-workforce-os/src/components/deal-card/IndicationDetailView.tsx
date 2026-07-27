/**
 * §Indication detail views — clicking a header KPI (LOCATIONS / EMPLOYEES /
 * PAYROLL / EXMOD) swaps the Quote tab's indication for one of these editable
 * detail views. Internal parties (broker / underwriter / admin) review and
 * adjust the deal's parameters as it progresses; every change is audited
 * (timestamp, before → after, acting party) and shown inline here as well as
 * in the Overview activity feed. Saving re-rates the quote automatically
 * (owner-review flag: see api-server lib/indication-rerate.ts).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Users, DollarSign, Gauge, Plus, Trash2, History, CheckCircle2, AlertTriangle, Pencil, Search, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { PinkButton, GhostButton } from "@/components/ui/axel-index";

export type IndicationMetric = "locations" | "employees" | "payroll" | "exmod";

type WpClassCode = {
  classCode?: string;
  description?: string;
  annualPayroll?: number;
  fullTimeEmployees?: number;
  partTimeEmployees?: number;
  [k: string]: unknown;
};
type WpLocation = {
  state?: string;
  zip?: string;
  street1?: string;
  street2?: string;
  city?: string;
  classCodes?: WpClassCode[];
  [k: string]: unknown;
};

type AddressSuggestion = { label: string; street1: string; city: string; state: string; zip: string };
export type WorkforceProfileShape = {
  locations?: WpLocation[];
  eMod?: number;
  scheduleRating?: number;
  isPEO?: boolean;
  [k: string]: unknown;
};

type HistoryRow = {
  id: string;
  eventType: string;
  description: string;
  metadata?: { metric?: string; field?: string; before?: unknown; after?: unknown; author?: string; role?: string } | null;
  createdAt?: string;
};

const METRIC_META: Record<IndicationMetric, { title: string; Icon: typeof MapPin; blurb: string }> = {
  locations: { title: "Locations", Icon: MapPin, blurb: "Where the business operates — full address per location." },
  employees: { title: "Employees", Icon: Users, blurb: "Full-time and part-time headcounts per location and class code." },
  payroll: { title: "Annual Payroll", Icon: DollarSign, blurb: "Annual payroll per location and class code." },
  exmod: { title: "Experience Mod", Icon: Gauge, blurb: "The experience modifier applied to the rated premium." },
};

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

export default function IndicationDetailView({
  dealId,
  metric,
  profile,
  pendingReview,
  editable,
  onBack,
  onSaved,
}: {
  dealId: string;
  metric: IndicationMetric;
  profile: WorkforceProfileShape;
  pendingReview: boolean;
  editable: boolean;
  onBack: () => void;
  onSaved: () => void;
}) {
  const c = useThemeColors();
  const meta = METRIC_META[metric];
  const [draft, setDraft] = useState<WorkforceProfileShape>(() => JSON.parse(JSON.stringify(profile || {})));
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [isPending, setIsPending] = useState(pendingReview);
  const [showHistory, setShowHistory] = useState(false);

  // Dirty when the draft differs from the last-loaded profile — drives the
  // header save button (grey/dormant until a change is made).
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(profile || {}), [draft, profile]);

  // Locations ledger state — which row is expanded for editing, plus the
  // docked smart-add bar (Census-geocoder autocomplete with manual fallback).
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [addSuggestions, setAddSuggestions] = useState<AddressSuggestion[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addManual, setAddManual] = useState(false);
  const [newLoc, setNewLoc] = useState<Partial<WpLocation>>({ state: "" });

  // Debounced address lookup for the smart-add bar.
  useEffect(() => {
    if (metric !== "locations" || addManual) return;
    const q = addQuery.trim();
    if (q.length < 4) {
      setAddSuggestions([]);
      setAddSearching(false);
      return;
    }
    setAddSearching(true);
    let stale = false; // guards against out-of-order responses overwriting newer input
    const t = setTimeout(async () => {
      try {
        const res = await api.get<{ suggestions: AddressSuggestion[] }>(`/geo/address-suggest?q=${encodeURIComponent(q)}`);
        if (!stale) setAddSuggestions(res.suggestions || []);
      } catch {
        if (!stale) setAddSuggestions([]);
      } finally {
        if (!stale) setAddSearching(false);
      }
    }, 450);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [addQuery, addManual, metric]);

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(profile || {})));
  }, [profile, metric]);
  useEffect(() => setIsPending(pendingReview), [pendingReview]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get<{ history: HistoryRow[] }>(`/deal-card/${dealId}/indication-params/history?metric=${metric}`);
      setHistory(res.history || []);
    } catch {
      setHistory([]);
    }
  }, [dealId, metric]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const locations = useMemo(() => draft.locations ?? [], [draft]);

  const patchLocation = (idx: number, patch: Partial<WpLocation>) => {
    setDraft((d) => {
      const locs = [...(d.locations ?? [])];
      locs[idx] = { ...locs[idx], ...patch };
      return { ...d, locations: locs };
    });
  };
  const patchClassCode = (li: number, ci: number, patch: Partial<WpClassCode>) => {
    setDraft((d) => {
      const locs = [...(d.locations ?? [])];
      const loc = { ...locs[li] };
      const ccs = [...(loc.classCodes ?? [])];
      ccs[ci] = { ...ccs[ci], ...patch };
      loc.classCodes = ccs;
      locs[li] = loc;
      return { ...d, locations: locs };
    });
  };

  const caMissingZip = locations.some(
    (l) => (l.state || "").toUpperCase() === "CA" && String(l.zip || "").replace(/\D/g, "").length < 5,
  );

  const save = async () => {
    if (saving || !editable) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.patch<{ success: boolean; changed: number; pendingReview: boolean; rerate?: { mode: string; ok?: boolean; error?: string } }>(
        `/deal-card/${dealId}/indication-params`,
        { metric, workforceProfile: draft },
      );
      setIsPending(res.pendingReview);
      if (res.changed === 0) {
        setNotice("No changes to save.");
      } else if (res.rerate && res.rerate.mode === "auto" && res.rerate.ok === false) {
        setError(`Saved, but re-rating failed: ${res.rerate.error || "rating error"}`);
      } else {
        setNotice(`Saved ${res.changed} change${res.changed === 1 ? "" : "s"} — indication re-rated.`);
      }
      await loadHistory();
      onSaved();
      window.dispatchEvent(new Event("deal-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    if (approving || !editable) return;
    setApproving(true);
    setError(null);
    try {
      await api.post(`/deal-card/${dealId}/indication-params/approve`, {});
      setIsPending(false);
      setNotice("Details approved — now visible to the client.");
      await loadHistory();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setApproving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: c.inputBg, border: `1px solid ${c.inputBorder}`, borderRadius: 8,
    color: c.inputText, fontFamily: "inherit", fontSize: 13, padding: "8px 10px", width: "100%", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: c.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 4,
    fontFamily: "var(--app-font-heading)",
  };
  const cardStyle: React.CSSProperties = {
    background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 12, padding: 16,
  };

  const fmtWhen = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "");

  const fmtAddress = (loc: WpLocation) => {
    const street = [loc.street1, loc.street2].filter(Boolean).join(", ");
    return [street, loc.city, [loc.state, loc.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  };
  const fmtPayroll = (loc: WpLocation) => {
    const total = (loc.classCodes || []).reduce((s, cc) => s + (Number(cc.annualPayroll) || 0), 0);
    if (!total) return "—";
    if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M`;
    if (total >= 1_000) return `$${Math.round(total / 1_000)}k`;
    return `$${total}`;
  };
  const emptyClassCodes = () => [{ classCode: "", description: "", annualPayroll: 0, fullTimeEmployees: 0, partTimeEmployees: 0 }];
  const appendLocation = (loc: WpLocation, expand: boolean) => {
    setDraft((d) => ({ ...d, locations: [...(d.locations ?? []), loc] }));
    setExpandedIdx(expand ? locations.length : null);
    setAddQuery("");
    setAddSuggestions([]);
    setAddManual(false);
    setNewLoc({ state: "" });
  };

  const renderAddressGrid = (loc: Partial<WpLocation>, patch: (p: Partial<WpLocation>) => void) => {
    const isCA = (loc.state || "").toUpperCase() === "CA";
    const zipShort = isCA && (loc.zip || "").replace(/\D/g, "").length < 5;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
        <div style={{ gridColumn: "span 8" }}>
          <div style={labelStyle}>Street address</div>
          <input value={loc.street1 || ""} disabled={!editable} placeholder="Street address" data-testid="input-street1"
            onChange={(e) => patch({ street1: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <div style={labelStyle}>Suite/Unit (opt)</div>
          <input value={loc.street2 || ""} disabled={!editable} placeholder="Suite, unit…" data-testid="input-street2"
            onChange={(e) => patch({ street2: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ gridColumn: "span 5" }}>
          <div style={labelStyle}>City</div>
          <input value={loc.city || ""} disabled={!editable} placeholder="City" data-testid="input-city"
            onChange={(e) => patch({ city: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ gridColumn: "span 3" }}>
          <div style={labelStyle}>State</div>
          <select value={loc.state || ""} disabled={!editable} data-testid="select-state"
            onChange={(e) => patch({ state: e.target.value })} style={{ ...inputStyle, appearance: "auto" }}>
            <option value="">State…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <div style={labelStyle}>ZIP{isCA ? " — 5-digit req" : ""}</div>
          <input value={loc.zip || ""} disabled={!editable} maxLength={10} placeholder="ZIP code" data-testid="input-zip"
            onChange={(e) => patch({ zip: e.target.value })}
            style={{ ...inputStyle, borderColor: zipShort ? "rgba(255,181,71,0.5)" : c.inputBorder }} />
        </div>
      </div>
    );
  };

  const renderLocationsEditor = () => (
    <div style={{ border: `1px solid ${c.borderColor}`, borderRadius: 12, background: c.cardBg, overflow: "visible" }}>
      {/* Ledger header */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${c.borderColor}`, ...labelStyle, marginBottom: 0 }}>
        <div style={{ width: 30 }} />
        <div style={{ flex: 1 }}>Location / Address</div>
        <div style={{ width: 100 }}>Class codes</div>
        <div style={{ width: 100 }}>Employees</div>
        <div style={{ width: 90 }}>Est. payroll</div>
        <div style={{ width: 60 }} />
      </div>

      {/* Rows */}
      {locations.map((loc, li) => {
        const isEditing = expandedIdx === li;
        const isCA = (loc.state || "").toUpperCase() === "CA";
        const zipShort = isCA && (loc.zip || "").replace(/\D/g, "").length < 5;
        const employees = (loc.classCodes || []).reduce((s, cc) => s + (Number(cc.fullTimeEmployees) || 0) + (Number(cc.partTimeEmployees) || 0), 0);
        const address = fmtAddress(loc);
        return (
          <div key={li} style={{ borderBottom: `1px solid ${c.borderColor}` }}>
            <div style={{ display: "flex", alignItems: "center", padding: "11px 14px", background: isEditing ? c.accentPrimarySoft : undefined }}>
              <div style={{ width: 30 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", border: `1px solid ${c.borderColor}`, fontSize: 10, fontWeight: 700, color: c.textMuted }}>{li + 1}</span>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span data-testid={`text-location-address-${li}`} style={{ fontSize: 13, fontWeight: 500, color: address ? c.textPrimary : c.textMuted, fontStyle: address ? undefined : "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {address || "New location"}
                </span>
                {zipShort && !isEditing && <AlertTriangle style={{ width: 14, height: 14, color: "#FFB547", flexShrink: 0 }} />}
              </div>
              <div style={{ width: 100, fontSize: 12, color: c.textMuted }}><span style={{ color: c.textPrimary, fontWeight: 500 }}>{(loc.classCodes || []).length}</span> classes</div>
              <div style={{ width: 100, fontSize: 12, color: c.textMuted }}><span style={{ color: c.textPrimary, fontWeight: 500 }}>{employees}</span> emp</div>
              <div style={{ width: 90, fontSize: 12, color: c.textMuted }}>{fmtPayroll(loc)}</div>
              <div style={{ width: 60, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                {editable && (
                  <button type="button" title={isEditing ? "Collapse" : "Edit location"} data-testid={`button-edit-location-${li}`}
                    onClick={() => setExpandedIdx(isEditing ? null : li)}
                    style={{ background: isEditing ? c.accentPrimarySoft : "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6 }}>
                    <Pencil style={{ width: 14, height: 14, color: isEditing ? "var(--accent-primary)" : c.textMuted }} />
                  </button>
                )}
                {editable && locations.length > 1 && (
                  <button type="button" title="Remove location" data-testid={`button-remove-location-${li}`}
                    onClick={() => {
                      setDraft((d) => ({ ...d, locations: (d.locations ?? []).filter((_, i) => i !== li) }));
                      setExpandedIdx(null);
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
                    <Trash2 style={{ width: 14, height: 14, color: c.textMuted }} />
                  </button>
                )}
              </div>
            </div>
            {isEditing && (
              <div style={{ padding: "14px 14px 16px 44px" }}>
                {renderAddressGrid(loc, (p) => patchLocation(li, p))}
                {zipShort && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 11, color: "#FFB547", background: "rgba(255,181,71,0.10)", border: "1px solid rgba(255,181,71,0.25)", borderRadius: 8, padding: "7px 10px" }}>
                    <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />
                    California locations require a 5-digit ZIP for territorial rating.
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <GhostButton onClick={() => setExpandedIdx(null)} style={{ padding: "6px 14px", fontSize: 12 }}>Done</GhostButton>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Docked smart-add bar */}
      {editable && (
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...labelStyle, marginBottom: 0, color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: 5 }}>
              <Plus style={{ width: 12, height: 12 }} />Add location
            </span>
            <button type="button" data-testid="button-toggle-manual-add"
              onClick={() => { setAddManual((m) => !m); setAddSuggestions([]); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, color: "var(--accent-primary)", padding: 0 }}>
              {addManual ? "Switch to smart entry" : "Enter manually"}
            </button>
          </div>
          {!addManual ? (
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--accent-primary)" }} />
              <input
                value={addQuery}
                data-testid="input-smart-add-address"
                onChange={(e) => setAddQuery(e.target.value)}
                placeholder="Start typing an address to add a location…"
                style={{ ...inputStyle, paddingLeft: 32, borderColor: "rgba(233,30,140,0.45)" }}
              />
              {addQuery.trim().length >= 4 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", zIndex: 30, overflow: "hidden" }}>
                  {addSuggestions.map((s, si) => (
                    <button key={si} type="button" data-testid={`button-suggestion-${si}`}
                      onClick={() => appendLocation({ street1: s.street1, city: s.city, state: s.state, zip: s.zip, classCodes: emptyClassCodes() }, false)}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "9px 12px" }}>
                      <MapPin style={{ width: 15, height: 15, color: "var(--accent-primary)", flexShrink: 0 }} />
                      <span>
                        <span style={{ display: "block", fontSize: 13, color: c.textPrimary, fontWeight: 500 }}>{s.street1}</span>
                        <span style={{ display: "block", fontSize: 11, color: c.textMuted, marginTop: 1 }}>{[s.city, s.state].filter(Boolean).join(", ")} {s.zip}</span>
                      </span>
                    </button>
                  ))}
                  <div style={{ padding: "7px 12px", borderTop: `1px solid ${c.borderColor}`, fontSize: 11, color: c.textMuted }}>
                    {addSearching ? "Searching…" : addSuggestions.length === 0 ? "No matches — try a fuller address, or enter manually." : "US Census address lookup"}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: c.inputBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: 14 }}>
              {renderAddressGrid(newLoc, (p) => setNewLoc((prev) => ({ ...prev, ...p })))}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <GhostButton onClick={() => { setAddManual(false); setNewLoc({ state: "" }); }} style={{ padding: "6px 14px", fontSize: 12 }}>Cancel</GhostButton>
                <PinkButton
                  data-testid="button-add-manual-location"
                  onClick={() => {
                    if (!newLoc.state) return;
                    appendLocation({ street1: newLoc.street1 || "", street2: newLoc.street2 || "", city: newLoc.city || "", state: newLoc.state || "", zip: newLoc.zip || "", classCodes: emptyClassCodes() }, false);
                  }}
                  style={{ padding: "6px 16px", fontSize: 12, opacity: newLoc.state ? 1 : 0.5 }}
                >
                  Add location
                </PinkButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderPerClassCodeEditor = (kind: "employees" | "payroll") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {locations.map((loc, li) => (
        <div key={li} style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.textPrimary, marginBottom: 10 }}>
            Location {li + 1} · {loc.state || "—"}{loc.zip ? ` ${loc.zip}` : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(loc.classCodes || []).map((cc, ci) => (
              <div key={ci} style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap", borderTop: ci > 0 ? `1px solid ${c.borderColor}` : undefined, paddingTop: ci > 0 ? 10 : 0 }}>
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <div style={labelStyle}>Class {cc.classCode || "—"}</div>
                  <div style={{ fontSize: 12, color: c.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cc.description || "No description"}
                  </div>
                </div>
                {kind === "employees" ? (
                  <>
                    <div style={{ width: 110 }}>
                      <div style={labelStyle}>Full-time</div>
                      <input type="number" min={0} disabled={!editable} value={Number(cc.fullTimeEmployees) || 0}
                        onChange={(e) => patchClassCode(li, ci, { fullTimeEmployees: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} style={inputStyle} />
                    </div>
                    <div style={{ width: 110 }}>
                      <div style={labelStyle}>Part-time</div>
                      <input type="number" min={0} disabled={!editable} value={Number(cc.partTimeEmployees) || 0}
                        onChange={(e) => patchClassCode(li, ci, { partTimeEmployees: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} style={inputStyle} />
                    </div>
                  </>
                ) : (
                  <div style={{ width: 180 }}>
                    <div style={labelStyle}>Annual payroll ($)</div>
                    <input type="number" min={0} step={1000} disabled={!editable} value={Number(cc.annualPayroll) || 0}
                      onChange={(e) => patchClassCode(li, ci, { annualPayroll: Math.max(0, Number(e.target.value) || 0) })} style={inputStyle} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderExmodEditor = () => (
    <div style={{ ...cardStyle, display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
      <div style={{ width: 160 }}>
        <div style={labelStyle}>Experience Mod (0.50 – 2.00)</div>
        <input
          type="number" min={0.5} max={2} step={0.01} disabled={!editable}
          value={draft.eMod ?? 1.0}
          onChange={(e) => setDraft((d) => ({ ...d, eMod: Number(e.target.value) }))}
          style={inputStyle}
        />
      </div>
      <div style={{ flex: 1, fontSize: 12, color: c.textMuted, paddingBottom: 9, minWidth: 220 }}>
        Below 1.00 reflects better-than-average loss experience; above 1.00 increases the rated premium proportionally.
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <GhostButton onClick={onBack} aria-label="Back" title="Back" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 7 }}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </GhostButton>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: c.accentPrimarySoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <meta.Icon style={{ width: 17, height: 17, color: "var(--accent-primary)" }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.textPrimary, lineHeight: 1.2 }}>{meta.title}</div>
            <div style={{ fontSize: 12, color: c.textMuted }}>{meta.blurb}</div>
          </div>
        </div>
        {editable && (
          <button
            type="button"
            data-testid="button-save-rerate"
            onClick={dirty && !saving ? save : undefined}
            disabled={!dirty || saving}
            style={{
              marginLeft: "auto",
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              borderRadius: 8,
              cursor: dirty && !saving ? "pointer" : "default",
              transition: "all 0.15s ease",
              background: dirty ? "var(--accent-primary)" : c.hoverBg,
              color: dirty ? "#fff" : c.textMuted,
              border: dirty ? "1px solid var(--accent-primary)" : `1px solid ${c.borderColor}`,
              boxShadow: dirty ? "0 2px 14px rgba(233,30,140,0.35)" : "none",
              opacity: saving || (dirty && metric === "locations" && caMissingZip) ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save & re-rate"}
          </button>
        )}
      </div>

      {/* Pending-review banner — internal edits are not client-visible until approved. */}
      {isPending && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,181,71,0.10)", border: "1px solid rgba(255,181,71,0.35)", flexWrap: "wrap" }}>
          <AlertTriangle style={{ width: 16, height: 16, color: "#FFB547", flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, color: c.textPrimary, minWidth: 220 }}>
            Updated details are pending internal agreement — the client still sees the last approved version.
          </span>
          {editable && (
            <GhostButton onClick={approve} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12 }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />{approving ? "Approving…" : "Approve for client"}
            </GhostButton>
          )}
        </div>
      )}

      {metric === "exmod" && draft.eMod != null && (draft.eMod < 0.5 || draft.eMod > 2) && (
        <div style={{ fontSize: 12, color: "#FFB547" }}>Experience mod must be between 0.50 and 2.00.</div>
      )}
      {metric === "locations" && caMissingZip && (
        <div style={{ fontSize: 12, color: "#FFB547" }}>
          California locations need a 5-digit ZIP to determine the territorial rating factor.
        </div>
      )}

      {/* Editor */}
      {metric === "locations" && renderLocationsEditor()}
      {metric === "employees" && renderPerClassCodeEditor("employees")}
      {metric === "payroll" && renderPerClassCodeEditor("payroll")}
      {metric === "exmod" && renderExmodEditor()}

      {/* Status row — save action lives in the header; this row carries messages. */}
      {(!editable || notice || error) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {!editable && (
            <span style={{ fontSize: 12, color: c.textMuted }}>Read-only — editing is limited to broker, underwriter, and admin.</span>
          )}
          {notice && <span style={{ fontSize: 12, color: "#00D68F" }}>{notice}</span>}
          {error && <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>}
        </div>
      )}

      {/* Inline change history for this metric — collapsed until requested. */}
      <div style={{ marginTop: 4 }}>
        <button
          type="button"
          data-testid="button-toggle-change-history"
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
          style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: c.textMuted, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", marginBottom: showHistory ? 10 : 0 }}
        >
          <History style={{ width: 14, height: 14 }} />
          Change history{history.length > 0 ? ` (${history.length})` : ""}
          <ChevronDown style={{ width: 13, height: 13, transform: showHistory ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }} />
        </button>
        {showHistory && (
          history.length === 0 ? (
            <div style={{ fontSize: 12, color: c.textMuted, padding: "10px 0" }}>No changes recorded yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((h) => {
                const isApproval = h.eventType === "indication_params_approved";
                return (
                  <div key={h.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flexShrink: 0, width: 16, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: isApproval ? "var(--accent-primary)" : c.textMuted, opacity: isApproval ? 1 : 0.6, display: "block" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: c.textMuted, lineHeight: "20px", overflowWrap: "anywhere" }}>
                      <span style={{ color: c.textSecondary, fontWeight: isApproval ? 500 : 400 }}>{h.description}</span>
                      <span style={{ fontSize: 10.5, marginLeft: 8, whiteSpace: "nowrap" }}>
                        {h.metadata?.role ? `${h.metadata.role} · ` : ""}{fmtWhen(h.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
