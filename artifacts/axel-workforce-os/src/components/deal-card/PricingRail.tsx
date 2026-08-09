/**
 * Pricing + decision block — rendered in the deal card's persistent right
 * rail. Three carded sections: Workers' Compensation Pricing, WFS Pricing,
 * and Submission Actions. Approve (gradient CTA — the single primary CTA per
 * spec) and Decline render only when the server grants `canApprove`
 * (UNDERWRITER/ADMIN, §8).
 *
 * Each pricing card has an inline "Modify" editor:
 *  - WC: adjusts the rating levers (EMod, schedule rating, PEO) through the
 *    quote-variations preview/apply endpoints (internal staff only — gated by
 *    `canModifyWc` from the shell, enforced again server-side).
 *  - WFS: re-runs the WFS rating engine with an overridden annual payroll and
 *    headcount.
 * Tokens only; verified light + dark.
 */
import { useState } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";
import type { VariationLevers } from "./types";

interface PricingRailProps {
  wcPremium: string | null;
  wfsMonthly: string | null;
  wfsPepm: string | null;
  wfsBusy?: boolean;
  wfsError?: string | null;
  onGetWfsQuote?: () => void;
  canApprove: boolean;
  busy: boolean;
  openBlocking?: number;
  approveError?: string | null;
  onApprove: () => void;
  onDecline: (reason: string) => void;
  /** WC modify: allowed for internal staff when the deal has a rateable quote. */
  canModifyWc?: boolean;
  /** Current levers on the quote — initial values for the WC editor. */
  wcBaseLevers?: VariationLevers | null;
  onPreviewWc?: (levers: VariationLevers) => Promise<{ premium: number; delta: number; deltaPct: number } | null>;
  onApplyWc?: (levers: VariationLevers) => Promise<boolean>;
  /** WFS modify: prefill values derived from the deal/quote. */
  wfsDefaults?: { annualPayroll: number; headcount: number } | null;
  onRequoteWfs?: (annualPayroll: number, headcount: number) => Promise<boolean>;
}

function hasValue(val: string | null): boolean {
  if (val == null || val === "") return false;
  const n = parseFloat(val);
  return !isNaN(n) && n > 0;
}

/** Format a raw digit string with thousands separators for display ("1250000" → "1,250,000"). */
function fmtCurrencyInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

/** Strip formatting back to a plain digit string ("1,250,000" → "1250000"). */
function parseCurrencyInput(display: string): string {
  return display.replace(/[^\d]/g, "");
}

function fmtUsd(val: string | number | null): string {
  if (val == null || val === "") return "\u2014";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n) || n === 0) return "\u2014";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PricingRail({
  wcPremium,
  wfsMonthly,
  wfsPepm,
  wfsBusy = false,
  wfsError,
  onGetWfsQuote,
  canApprove,
  busy,
  openBlocking = 0,
  approveError,
  onApprove,
  onDecline,
  canModifyWc = false,
  wcBaseLevers,
  onPreviewWc,
  onApplyWc,
  wfsDefaults,
  onRequoteWfs,
}: PricingRailProps) {
  const c = useThemeColors();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const blocked = openBlocking > 0;

  /* ---------------- WC inline modify editor ---------------- */
  const [wcEditing, setWcEditing] = useState(false);
  const [eMod, setEMod] = useState("");
  const [schedRating, setSchedRating] = useState("");
  const [isPeo, setIsPeo] = useState(false);
  const [wcPreview, setWcPreview] = useState<{ premium: number; delta: number; deltaPct: number } | null>(null);
  const [wcBusy, setWcBusy] = useState(false);
  const [wcErr, setWcErr] = useState<string | null>(null);

  const openWcEditor = () => {
    setEMod(String(wcBaseLevers?.eMod ?? 1.0));
    setSchedRating(String(wcBaseLevers?.scheduleRating ?? 1.0));
    setIsPeo(!!wcBaseLevers?.isPEO);
    setWcPreview(null);
    setWcErr(null);
    setWcEditing(true);
  };

  const parseLevers = (): VariationLevers | null => {
    const e = parseFloat(eMod);
    const s = parseFloat(schedRating);
    if (isNaN(e) || e < 0.5 || e > 2.0 || isNaN(s) || s < 0.5 || s > 2.0) {
      setWcErr("EMod and schedule rating must be between 0.50 and 2.00.");
      return null;
    }
    setWcErr(null);
    return { eMod: e, scheduleRating: s, isPEO: isPeo };
  };

  const handleWcPreview = async () => {
    const levers = parseLevers();
    if (!levers || !onPreviewWc || wcBusy) return;
    setWcBusy(true);
    setWcPreview(null);
    try {
      const res = await onPreviewWc(levers);
      if (res) setWcPreview(res);
      else setWcErr("Could not preview — the quote may be missing rating inputs.");
    } finally {
      setWcBusy(false);
    }
  };

  const handleWcApply = async () => {
    const levers = parseLevers();
    if (!levers || !onApplyWc || wcBusy) return;
    setWcBusy(true);
    try {
      const ok = await onApplyWc(levers);
      if (ok) {
        setWcEditing(false);
        setWcPreview(null);
      } else {
        setWcErr("Could not apply the new pricing. Try again.");
      }
    } finally {
      setWcBusy(false);
    }
  };

  /* ---------------- WFS inline modify editor ---------------- */
  const [wfsEditing, setWfsEditing] = useState(false);
  const [wfsPayroll, setWfsPayroll] = useState("");
  const [wfsHeadcount, setWfsHeadcount] = useState("");
  const [wfsEditErr, setWfsEditErr] = useState<string | null>(null);

  const openWfsEditor = () => {
    setWfsPayroll(wfsDefaults?.annualPayroll ? String(Math.round(wfsDefaults.annualPayroll)) : "");
    setWfsHeadcount(wfsDefaults?.headcount ? String(wfsDefaults.headcount) : "");
    setWfsEditErr(null);
    setWfsEditing(true);
  };

  const handleWfsRequote = async () => {
    if (!onRequoteWfs || wfsBusy) return;
    const p = parseFloat(wfsPayroll);
    const h = parseInt(wfsHeadcount, 10);
    if (isNaN(p) || p <= 0 || isNaN(h) || h <= 0) {
      setWfsEditErr("Enter a positive annual payroll and headcount.");
      return;
    }
    setWfsEditErr(null);
    const ok = await onRequoteWfs(p, h);
    if (ok) setWfsEditing(false);
  };

  /* ---------------- shared styles ---------------- */
  const heading: React.CSSProperties = {
    fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: c.textMuted, fontWeight: 600,
  };
  const card: React.CSSProperties = {
    background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 12, padding: 12,
  };
  const subLabel: React.CSSProperties = {
    fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: c.textMuted,
  };
  const modifyBtn: React.CSSProperties = {
    width: "100%", textAlign: "center", fontSize: 11.5, borderRadius: 8, padding: "7px 8px",
    cursor: "pointer", color: c.textSecondary, border: `1px solid ${c.borderColor}`, background: c.hoverBg,
    fontFamily: "inherit", marginTop: 10,
  };
  const miniInput: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: c.inputBg, border: `1px solid ${c.inputBorder}`,
    borderRadius: 8, color: c.inputText, fontFamily: "inherit", fontSize: 12, padding: "7px 9px",
  };
  const miniLabel: React.CSSProperties = { fontSize: 10, color: c.textMuted, marginBottom: 3, display: "block" };
  const ghostBtn: React.CSSProperties = {
    flex: 1, fontSize: 11.5, borderRadius: 8, padding: "7px 8px", cursor: "pointer",
    color: c.textSecondary, border: `1px solid ${c.borderColor}`, background: "none", fontFamily: "inherit",
  };
  const ctaBtn: React.CSSProperties = {
    flex: 1, fontSize: 11.5, borderRadius: 8, padding: "7px 8px", cursor: "pointer", fontWeight: 600,
    color: "#fff", background: "var(--gradient-cta)", border: "none", fontFamily: "inherit",
  };

  return (
    <>
      {/* Workers' Compensation pricing */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={heading}>Workers&rsquo; Compensation Pricing</span>
        <div style={card}>
          <div style={subLabel}>Total Est. Premium</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: c.textPrimary, marginTop: 2 }}>{fmtUsd(wcPremium)}</div>

          {canModifyWc && !wcEditing && (
            <button style={modifyBtn} onClick={openWcEditor}>Modify</button>
          )}

          {wcEditing && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={miniLabel}>EMod</label>
                  <input type="number" step="0.01" min="0.5" max="2" value={eMod} onChange={(e) => { setEMod(e.target.value); setWcPreview(null); }} style={miniInput} disabled={wcBusy} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={miniLabel}>Sched. Rating</label>
                  <input type="number" step="0.01" min="0.5" max="2" value={schedRating} onChange={(e) => { setSchedRating(e.target.value); setWcPreview(null); }} style={miniInput} disabled={wcBusy} />
                </div>
              </div>
              <div>
                <label style={miniLabel}>PEO Program</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => { setIsPeo(v); setWcPreview(null); }}
                      disabled={wcBusy}
                      style={{
                        flex: 1, fontSize: 11, borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontFamily: "inherit",
                        border: isPeo === v ? "1px solid var(--accent-primary)" : `1px solid ${c.inputBorder}`,
                        background: isPeo === v ? "var(--accent-primary-soft)" : "transparent",
                        color: isPeo === v ? "var(--accent-primary)" : c.textSecondary,
                      }}
                    >
                      {v ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>

              {wcPreview && (
                <div style={{ fontSize: 11.5, color: c.textPrimary, background: c.hoverBg, borderRadius: 8, padding: "7px 9px" }}>
                  New premium: <strong>{fmtUsd(wcPreview.premium)}</strong>{" "}
                  <span style={{ color: wcPreview.delta > 0 ? "#ef4444" : STATUS_GREEN }}>
                    ({wcPreview.delta >= 0 ? "+" : ""}{fmtUsd(wcPreview.delta)} / {wcPreview.deltaPct >= 0 ? "+" : ""}{wcPreview.deltaPct}%)
                  </span>
                </div>
              )}
              {wcErr && <div style={{ fontSize: 10.5, color: "#ef4444", lineHeight: 1.45 }}>{wcErr}</div>}

              <div style={{ display: "flex", gap: 6 }}>
                <button style={ghostBtn} disabled={wcBusy} onClick={() => { setWcEditing(false); setWcPreview(null); setWcErr(null); }}>Cancel</button>
                <button style={ghostBtn} disabled={wcBusy} onClick={() => void handleWcPreview()}>{wcBusy && !wcPreview ? "\u2026" : "Preview"}</button>
                <button
                  style={{ ...ctaBtn, opacity: wcPreview ? 1 : 0.5, cursor: wcPreview ? "pointer" : "not-allowed" }}
                  disabled={wcBusy || !wcPreview}
                  title={wcPreview ? undefined : "Preview the new premium first"}
                  onClick={() => void handleWcApply()}
                >
                  {wcBusy ? "\u2026" : "Apply"}
                </button>
              </div>
            </div>
          )}

          <div style={{ fontSize: 10, color: c.textMuted, marginTop: 8, fontStyle: "italic" }}>
            Required documents missing for binding.
          </div>
        </div>
      </div>

      {/* WFS pricing — breakdown when priced; one-click generator otherwise. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={heading}>WFS Pricing</span>
        <div style={card}>
          {hasValue(wfsMonthly) || hasValue(wfsPepm) ? (
            <>
              <div style={subLabel}>Workforce Solutions Pricing</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: c.textPrimary, marginTop: 2 }}>{fmtUsd(wfsMonthly)}</div>
              <div style={{ ...subLabel, marginTop: 8 }}>Per Employee</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: c.textPrimary }}>{hasValue(wfsPepm) ? `$${wfsPepm}` : "\u2014"}</div>
              {onRequoteWfs && !wfsEditing && (
                <button style={modifyBtn} onClick={openWfsEditor}>Modify</button>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: c.textMuted, lineHeight: 1.5, marginBottom: 10 }}>
                No WFS pricing yet for this deal.
              </div>
              <button
                onClick={onGetWfsQuote}
                disabled={wfsBusy || !onGetWfsQuote}
                style={{
                  width: "100%", textAlign: "center", fontSize: 12.5, borderRadius: 8, padding: "9px 8px",
                  cursor: wfsBusy ? "wait" : "pointer", fontWeight: 600, color: "#fff",
                  background: "var(--gradient-cta)", border: "none", fontFamily: "inherit",
                  opacity: wfsBusy ? 0.7 : 1,
                }}
              >
                {wfsBusy ? "Generating\u2026" : "Get Quote Now"}
              </button>
            </>
          )}

          {wfsEditing && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={miniLabel}>Annual Payroll ($)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1,250,000"
                  value={fmtCurrencyInput(wfsPayroll)}
                  onChange={(e) => setWfsPayroll(parseCurrencyInput(e.target.value))}
                  style={miniInput}
                  disabled={wfsBusy}
                />
              </div>
              <div>
                <label style={miniLabel}>Headcount</label>
                <input type="number" min="1" step="1" value={wfsHeadcount} onChange={(e) => setWfsHeadcount(e.target.value)} style={miniInput} disabled={wfsBusy} />
              </div>
              {wfsEditErr && <div style={{ fontSize: 10.5, color: "#ef4444", lineHeight: 1.45 }}>{wfsEditErr}</div>}
              <div style={{ display: "flex", gap: 6 }}>
                <button style={ghostBtn} disabled={wfsBusy} onClick={() => { setWfsEditing(false); setWfsEditErr(null); }}>Cancel</button>
                <button style={ctaBtn} disabled={wfsBusy} onClick={() => void handleWfsRequote()}>{wfsBusy ? "Rating\u2026" : "Re-quote"}</button>
              </div>
            </div>
          )}

          {wfsError && (
            <div style={{ fontSize: 10.5, color: "#ef4444", lineHeight: 1.45, marginTop: 8 }}>{wfsError}</div>
          )}
        </div>
      </div>

      {/* Submission actions */}
      {canApprove && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={heading}>Submission Actions</span>
          {!declining ? (
            <>
              {blocked && (
                <div style={{ fontSize: 10.5, color: "#ef4444", lineHeight: 1.45, marginBottom: 2 }}>
                  Blocked by {openBlocking} open RFI{openBlocking > 1 ? "s" : ""}. Resolve or waive {openBlocking > 1 ? "them" : "it"} to approve.
                </div>
              )}
              <button
                onClick={onApprove}
                disabled={busy || blocked}
                title={blocked ? "Cannot approve while a blocking RFI is open" : undefined}
                style={{ width: "100%", textAlign: "center", fontSize: 13, borderRadius: 8, padding: 10, cursor: busy || blocked ? "not-allowed" : "pointer", fontWeight: 600, color: "#fff", background: "var(--gradient-cta)", border: "none", opacity: blocked ? 0.5 : 1 }}
              >
                {busy ? "Working\u2026" : "Approve"}
              </button>
              {approveError && !blocked && (
                <div style={{ fontSize: 10.5, color: "#ef4444", lineHeight: 1.45 }}>{approveError}</div>
              )}
              <button
                onClick={() => setDeclining(true)}
                disabled={busy}
                style={{ width: "100%", textAlign: "center", fontSize: 13, borderRadius: 8, padding: 10, cursor: "pointer", color: c.textSecondary, border: `1px solid ${c.borderColor}`, background: "none" }}
              >
                Decline
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for decline\u2026"
                rows={3}
                style={{ background: c.inputBg, border: `1px solid ${c.inputBorder}`, borderRadius: 8, color: c.inputText, fontFamily: "inherit", fontSize: 12, padding: 8, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => { setDeclining(false); setReason(""); }}
                  disabled={busy}
                  style={{ flex: 1, fontSize: 12, borderRadius: 8, padding: 7, cursor: "pointer", color: c.textSecondary, border: `1px solid ${c.borderColor}`, background: "none" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onDecline(reason)}
                  disabled={busy || reason.trim().length === 0}
                  style={{ flex: 1, fontSize: 12, borderRadius: 8, padding: 7, cursor: reason.trim() ? "pointer" : "not-allowed", color: "#fff", background: "var(--gradient-cta)", border: "none", fontWeight: 500, opacity: reason.trim() ? 1 : 0.5 }}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Matches STATUS_COLORS.complete without importing the icon module. */
const STATUS_GREEN = "#22c55e";
