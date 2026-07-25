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
import { ArrowLeft, MapPin, Users, DollarSign, Gauge, Plus, Trash2, History, CheckCircle2, AlertTriangle } from "lucide-react";
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
type WpLocation = { state?: string; zip?: string; classCodes?: WpClassCode[]; [k: string]: unknown };
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
  locations: { title: "Locations", Icon: MapPin, blurb: "Where the business operates — state and ZIP per location." },
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

  const renderLocationsEditor = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {locations.map((loc, li) => (
        <div key={li} style={cardStyle}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <div style={{ width: 120 }}>
              <div style={labelStyle}>Location {li + 1} — State</div>
              <select
                value={loc.state || ""}
                disabled={!editable}
                onChange={(e) => patchLocation(li, { state: e.target.value })}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="">State…</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ width: 140 }}>
              <div style={labelStyle}>ZIP{(loc.state || "").toUpperCase() === "CA" ? " (required for CA)" : ""}</div>
              <input
                value={loc.zip || ""}
                disabled={!editable}
                maxLength={10}
                placeholder="ZIP code"
                onChange={(e) => patchLocation(li, { zip: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, fontSize: 12, color: c.textMuted, paddingBottom: 9 }}>
              {(loc.classCodes || []).length} class code{(loc.classCodes || []).length === 1 ? "" : "s"} ·{" "}
              {(loc.classCodes || []).reduce((s, cc) => s + (Number(cc.fullTimeEmployees) || 0) + (Number(cc.partTimeEmployees) || 0), 0)} employees
            </div>
            {editable && locations.length > 1 && (
              <button
                type="button"
                title="Remove location"
                onClick={() => setDraft((d) => ({ ...d, locations: (d.locations ?? []).filter((_, i) => i !== li) }))}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 6, marginBottom: 3 }}
              >
                <Trash2 style={{ width: 16, height: 16, color: c.textMuted }} />
              </button>
            )}
          </div>
        </div>
      ))}
      {editable && (
        <GhostButton
          onClick={() =>
            setDraft((d) => ({
              ...d,
              locations: [...(d.locations ?? []), { state: "", zip: "", classCodes: [{ classCode: "", description: "", annualPayroll: 0, fullTimeEmployees: 0, partTimeEmployees: 0 }] }],
            }))
          }
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, alignSelf: "flex-start" }}
        >
          <Plus style={{ width: 14, height: 14 }} />Add location
        </GhostButton>
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

      {/* Save row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {editable ? (
          <PinkButton
            onClick={save}
            style={{ padding: "9px 22px", fontSize: 13, opacity: saving || (metric === "locations" && caMissingZip) ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Save & re-rate"}
          </PinkButton>
        ) : (
          <span style={{ fontSize: 12, color: c.textMuted }}>Read-only — editing is limited to broker, underwriter, and admin.</span>
        )}
        {notice && <span style={{ fontSize: 12, color: "#00D68F" }}>{notice}</span>}
        {error && <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>}
      </div>

      {/* Inline change history for this metric */}
      <div style={{ marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: c.textMuted, marginBottom: 8 }}>
          <History style={{ width: 14, height: 14 }} />Change history
        </div>
        {history.length === 0 ? (
          <div style={{ fontSize: 12, color: c.textMuted, padding: "10px 0" }}>No changes recorded yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 12px", borderRadius: 8, background: c.cardBg, border: `1px solid ${c.borderColor}`, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: c.textPrimary, flex: 1, minWidth: 220 }}>
                  {h.eventType === "indication_params_approved" ? (
                    <span style={{ color: "#00D68F" }}>{h.description}</span>
                  ) : (
                    h.description
                  )}
                </span>
                <span style={{ fontSize: 11, color: c.textMuted, whiteSpace: "nowrap" }}>
                  {h.metadata?.role ? `${h.metadata.role} · ` : ""}{fmtWhen(h.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
