/**
 * Phase 4C — right-rail pricing + decision block. Shows WC est. premium and WFS
 * pricing; Approve (gradient CTA — the single primary CTA per spec) and Decline
 * are rendered only when the server grants `canApprove` (UNDERWRITER/ADMIN, §8).
 */
import { useState } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";

interface PricingRailProps {
  wcPremium: string | null;
  wfsMonthly: string | null;
  wfsPepm: string | null;
  canApprove: boolean;
  busy: boolean;
  onApprove: () => void;
  onDecline: (reason: string) => void;
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
  canApprove,
  busy,
  onApprove,
  onDecline,
}: PricingRailProps) {
  const c = useThemeColors();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <div style={{ borderTop: `1px solid ${c.borderColor}`, paddingTop: 11 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.06em", color: c.textMuted }}>WC EST. PREMIUM</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: c.textPrimary }}>{fmtUsd(wcPremium)}</div>
        <div style={{ fontSize: 11, letterSpacing: "0.06em", color: c.textMuted, marginTop: 8 }}>WFS PRICING</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: c.textPrimary }}>
          {fmtUsd(wfsMonthly)}
          {wfsPepm ? <span style={{ fontSize: 10, color: c.textMuted }}> {"\u00b7"} ${wfsPepm}/emp</span> : null}
        </div>
      </div>

      {canApprove && (
        <div style={{ borderTop: `1px solid ${c.borderColor}`, paddingTop: 11 }}>
          {!declining ? (
            <>
              <button
                onClick={onApprove}
                disabled={busy}
                style={{ width: "100%", textAlign: "center", fontSize: 12, borderRadius: 8, padding: 8, cursor: "pointer", fontWeight: 500, color: "#fff", background: "var(--gradient-cta)", border: "none" }}
              >
                {busy ? "Working\u2026" : "Approve"}
              </button>
              <button
                onClick={() => setDeclining(true)}
                disabled={busy}
                style={{ width: "100%", textAlign: "center", fontSize: 12, borderRadius: 8, padding: 8, cursor: "pointer", color: c.textSecondary, border: `1px solid ${c.borderColor}`, background: "none", marginTop: 6 }}
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
                  style={{ flex: 1, fontSize: 12, borderRadius: 8, padding: 7, cursor: reason.trim() ? "pointer" : "not-allowed", color: "#fff", background: "var(--accent-primary)", border: "none", fontWeight: 500, opacity: reason.trim() ? 1 : 0.5 }}
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
