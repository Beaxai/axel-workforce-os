/**
 * Phase 4C — right-rail pricing + decision block (Stitch layout, Axel tokens).
 * Three carded sections: Workers' Compensation Pricing, WFS Pricing, and
 * Submission Actions. Approve (gradient CTA — the single primary CTA per spec)
 * and Decline render only when the server grants `canApprove`
 * (UNDERWRITER/ADMIN, §8). Tokens only; verified light + dark.
 */
import { useState } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";

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
  onModify?: () => void;
}

function hasValue(val: string | null): boolean {
  if (val == null || val === "") return false;
  const n = parseFloat(val);
  return !isNaN(n) && n > 0;
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
  onModify,
}: PricingRailProps) {
  const c = useThemeColors();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const blocked = openBlocking > 0;

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

  return (
    <>
      {/* Workers' Compensation pricing */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={heading}>Workers&rsquo; Compensation Pricing</span>
        <div style={card}>
          <div style={subLabel}>Total Est. Premium</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: c.textPrimary, marginTop: 2 }}>{fmtUsd(wcPremium)}</div>
          <button style={modifyBtn} onClick={onModify}>Modify</button>
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
              <button style={modifyBtn} onClick={onModify}>Modify</button>
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
              {wfsError && (
                <div style={{ fontSize: 10.5, color: "#ef4444", lineHeight: 1.45, marginTop: 8 }}>{wfsError}</div>
              )}
            </>
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
