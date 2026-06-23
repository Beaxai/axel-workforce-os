/**
 * Phase 4C — re-rate banner. Shows when a rating-relevant submission field was
 * edited (deal.ratingStale). "Re-rate" routes to the quote flow and clears the
 * stale flag on the server (spec §6).
 */
import { AlertTriangle } from "lucide-react";
import { STATUS_COLORS } from "./icons";

interface ReRateBannerProps {
  show: boolean;
  onReRate: () => void;
}

export default function ReRateBanner({ show, onReRate }: ReRateBannerProps) {
  if (!show) return null;
  const warn = STATUS_COLORS.partial;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        background: "rgba(199,154,58,0.10)",
        border: `1px solid rgba(199,154,58,0.30)`,
        borderRadius: 10,
        padding: "9px 12px",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: warn }}>
        <AlertTriangle style={{ width: 15, height: 15 }} />
        Rating inputs changed — re-rate required
      </div>
      <button
        onClick={onReRate}
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "#fff",
          background: "var(--accent-primary)",
          border: "none",
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
        }}
      >
        Re-rate
      </button>
    </div>
  );
}
