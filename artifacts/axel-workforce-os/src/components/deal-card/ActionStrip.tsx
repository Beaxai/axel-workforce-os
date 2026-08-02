/**
 * ActionStrip — slim persistent bar above the tab content in the deal-card
 * dialog. Shows only the deal's current primary action button so it stays
 * reachable on every tab (the big card header above is untouched):
 *   - "Approve" when the server grants canApprove (Underwriter/Admin),
 *     disabled while blocked by open RFIs.
 *   - "Get Quote Now" when there is no WFS pricing yet.
 * Renders nothing when no action applies, so the strip disappears entirely.
 */
import { useThemeColors } from "@/lib/use-theme-colors";

interface ActionStripProps {
  canApprove: boolean;
  busy: boolean;
  openBlocking: number;
  approveError?: string | null;
  onApprove: () => void;
  hasWfsPricing: boolean;
  /** False until the quote fetch settles — prevents a "Get Quote Now" flash. */
  wfsResolved: boolean;
  wfsBusy: boolean;
  onGetWfsQuote: () => void;
}

const ctaStyle = (disabled: boolean, wait: boolean): React.CSSProperties => ({
  fontSize: 12.5,
  fontWeight: 600,
  color: "#fff",
  background: "var(--gradient-cta)",
  border: "none",
  borderRadius: 8,
  padding: "7px 18px",
  fontFamily: "inherit",
  cursor: disabled ? (wait ? "wait" : "not-allowed") : "pointer",
  opacity: disabled ? 0.6 : 1,
});

export default function ActionStrip({
  canApprove,
  busy,
  openBlocking,
  approveError,
  onApprove,
  hasWfsPricing,
  wfsResolved,
  wfsBusy,
  onGetWfsQuote,
}: ActionStripProps) {
  const c = useThemeColors();
  const blocked = openBlocking > 0;

  let button: React.ReactNode = null;
  let hint: string | null = null;

  if (canApprove) {
    if (blocked) hint = `Blocked by ${openBlocking} open RFI${openBlocking > 1 ? "s" : ""}`;
    else if (approveError) hint = approveError;
    button = (
      <button
        onClick={onApprove}
        disabled={busy || blocked}
        title={blocked ? "Cannot approve while a blocking RFI is open" : undefined}
        data-testid="button-action-strip-approve"
        style={ctaStyle(busy || blocked, busy)}
      >
        {busy ? "Working\u2026" : "Approve"}
      </button>
    );
  } else if (wfsResolved && !hasWfsPricing) {
    button = (
      <button
        onClick={onGetWfsQuote}
        disabled={wfsBusy}
        data-testid="button-action-strip-get-quote"
        style={ctaStyle(wfsBusy, wfsBusy)}
      >
        {wfsBusy ? "Generating\u2026" : "Get Quote Now"}
      </button>
    );
  }

  if (!button) return null;

  return (
    <div
      data-testid="deal-action-strip"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        flexShrink: 0,
        padding: "8px 14px",
        borderBottom: `1px solid ${c.borderColor}`,
        background: c.cardBg,
      }}
    >
      {hint && <span style={{ fontSize: 10.5, color: "#ef4444" }}>{hint}</span>}
      {button}
    </div>
  );
}
