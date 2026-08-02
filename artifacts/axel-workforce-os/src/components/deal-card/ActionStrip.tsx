/**
 * ActionStrip — slim persistent bar above the tab content in the deal-card
 * dialog. Carries the deal's single primary action: "Request Proposal".
 * Clicking it reopens the indication form (quote wizard) prefilled from the
 * deal, landing on the first section that still needs completing before a
 * proposal can be requested. A muted hint shows how many sections remain.
 */
import { useThemeColors } from "@/lib/use-theme-colors";

interface ActionStripProps {
  /** Number of submission sections not yet complete. */
  incompleteSections: number;
  onRequestProposal: () => void;
}

export default function ActionStrip({ incompleteSections, onRequestProposal }: ActionStripProps) {
  const c = useThemeColors();
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
      {incompleteSections > 0 && (
        <span style={{ fontSize: 10.5, color: c.textMuted }}>
          {incompleteSections} section{incompleteSections > 1 ? "s" : ""} to complete
        </span>
      )}
      <button
        onClick={onRequestProposal}
        data-testid="button-action-strip-request-proposal"
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: "#fff",
          background: "var(--gradient-cta)",
          border: "none",
          borderRadius: 8,
          padding: "7px 18px",
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        Request Proposal
      </button>
    </div>
  );
}
