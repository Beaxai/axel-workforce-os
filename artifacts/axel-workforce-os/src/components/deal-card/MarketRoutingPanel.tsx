import { useState } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";
import type { MarketRoutingSummary } from "./types";
import { RefreshCw, XOctagon } from "lucide-react";

interface MarketRoutingPanelProps {
  summary: MarketRoutingSummary | null;
  selectedMarketId: string | null;
  onSelectMarket: (id: string | null) => void;
  onRetry: () => Promise<void>;
  onCancel: (reason: string) => Promise<void>;
  isInternalAdminOrCsa: boolean;
}

export default function MarketRoutingPanel({
  summary,
  selectedMarketId,
  onSelectMarket,
  onRetry,
  onCancel,
  isInternalAdminOrCsa
}: MarketRoutingPanelProps) {
  const c = useThemeColors();
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [isActing, setIsActing] = useState(false);

  if (!summary || !summary.hasMarkets) return null;

  if (!isInternalAdminOrCsa) {
    if (!summary.primaryPricing) return null;
    return (
      <div style={{ background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Market Pricing</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: c.textPrimary }}>
            {summary.primaryPricing.annualAmount != null ? `$${summary.primaryPricing.annualAmount.toLocaleString()}` : "Pending"}
          </span>
          <span style={{ fontSize: 12, color: c.textSecondary }}>
            {summary.primaryPricing.rankingState === "LOCKED" ? "Locked" : summary.primaryPricing.rankingState}
          </span>
          {summary.primaryPricing.productLane && (
             <span style={{ fontSize: 11, background: c.hoverBg, padding: '2px 6px', borderRadius: 4, color: c.textSecondary }}>{summary.primaryPricing.productLane}</span>
          )}
        </div>
      </div>
    );
  }

  const markets = summary.markets || [];
  const hasFailures =
    (summary.batchStatus === "FAILED" || summary.batchStatus === "COMPLETE") &&
    markets.some((m) => m.sendStatus === "FAILED" || m.sendStatus === "DELIVERY_UNKNOWN");
  const canCancel =
    markets.length > 0 &&
    summary.batchStatus !== "PROCESSING" &&
    !markets.some((m) => m.sendStatus === "SENT" || m.rankingState === "LOCKED");

  const handleCancelClick = async () => {
    if (!cancelConfirm) {
      setCancelConfirm(true);
      return;
    }
    if (!cancelReason.trim()) {
      setActionError("Reason required to cancel.");
      return;
    }
    setActionError("");
    setIsActing(true);
    try {
      await onCancel(cancelReason);
      setCancelConfirm(false);
      setCancelReason("");
    } catch (e: any) {
      setActionError(e.message || "Failed to cancel");
    } finally {
      setIsActing(false);
    }
  };

  const handleRetryClick = async () => {
    setActionError("");
    setIsActing(true);
    try {
      await onRetry();
    } catch (e: any) {
      setActionError(e.message || "Failed to retry");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>Market Routing</span>
            {summary.batchId && (
              <span style={{ fontSize: 10, background: c.hoverBg, padding: '2px 6px', borderRadius: 4, color: c.textMuted, fontFamily: 'monospace' }}>
                Batch {summary.batchId.split('-')[0]}
              </span>
            )}
            <span style={{ fontSize: 10, border: `1px solid ${c.borderColor}`, padding: '2px 6px', borderRadius: 4, color: c.textSecondary, textTransform: 'uppercase' }}>
              {summary.batchStatus || "DRAFT"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: c.textSecondary }}>
            Only Ranks 1–4 are routed. The <strong style={{ color: c.textPrimary }}>Primary</strong> market determines external pricing.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasFailures && (
              <button disabled={isActing} data-testid="retry-routing-btn" onClick={handleRetryClick} style={{ opacity: isActing ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: c.textPrimary, background: c.hoverBg, border: `1px solid ${c.borderColor}`, padding: '4px 8px', borderRadius: 6, cursor: isActing ? 'not-allowed' : 'pointer' }}>
                <RefreshCw size={12} /> Retry Failed
              </button>
            )}
            {canCancel && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {cancelConfirm && (
                  <input 
                    autoFocus
                    placeholder="Cancel reason..."
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    disabled={isActing}
                    style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: `1px solid ${c.borderColor}`, background: c.bg, color: c.textPrimary }}
                  />
                )}
                <button disabled={isActing} data-testid="cancel-routing-btn" onClick={handleCancelClick} style={{ opacity: isActing ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#ef4444', background: `${c.hoverBg}`, border: `1px solid ${c.borderColor}`, padding: '4px 8px', borderRadius: 6, cursor: isActing ? 'not-allowed' : 'pointer' }}>
                  <XOctagon size={12} /> {cancelConfirm ? "Confirm Cancel" : "Cancel Batch"}
                </button>
                {cancelConfirm && (
                  <button disabled={isActing} onClick={() => { setCancelConfirm(false); setCancelReason(""); setActionError(""); }} style={{ fontSize: 11, padding: '4px 8px', cursor: 'pointer', background: 'none', border: 'none', color: c.textMuted }}>
                    Abort
                  </button>
                )}
              </div>
            )}
          </div>
          {actionError && (
            <div style={{ fontSize: 11, color: '#ef4444' }}>
              {actionError}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          type="button"
          aria-pressed={selectedMarketId === null}
          aria-label="Show all deal activity"
          onClick={() => onSelectMarket(null)}
          data-testid="market-tab-all"
          style={{
            flexShrink: 0,
            width: 120,
            padding: 12,
            borderRadius: 8,
            border: selectedMarketId === null ? `2px solid var(--accent-primary)` : `1px solid ${c.borderColor}`,
            background: selectedMarketId === null ? `${c.borderColor}22` : c.cardBg,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            boxSizing: 'border-box',
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: selectedMarketId === null ? c.textPrimary : c.textSecondary }}>All Activity</span>
        </button>

        {markets.map(m => {
           const isSelected = selectedMarketId === m.dealMarketId;
           const isRouted = m.isRouted || (m.rank !== null && m.rank <= 4);
           return (
             <button
               type="button"
               aria-pressed={isSelected}
               aria-label={`Show activity for rank ${m.rank ?? "unranked"} ${m.marketName}`}
               key={m.dealMarketId}
               onClick={() => onSelectMarket(m.dealMarketId)}
               data-testid={`market-tab-${m.dealMarketId}`}
               style={{
                 flexShrink: 0,
                 minWidth: 200,
                 padding: 12,
                 borderRadius: 8,
                 border: isSelected ? `2px solid var(--accent-primary)` : `1px solid ${m.isPrimary ? 'var(--accent-primary)' : c.borderColor}`,
                 background: isSelected ? `${c.borderColor}22` : c.cardBg,
                 cursor: 'pointer',
                 display: 'flex',
                 flexDirection: 'column',
                 gap: 8,
                 opacity: isRouted ? 1 : 0.6,
                 boxSizing: 'border-box',
                 textAlign: "left",
                 fontFamily: "inherit",
               }}
             >
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                   <span style={{ fontSize: 12, fontWeight: 700, color: c.textPrimary, display: 'flex', alignItems: 'center', gap: 4 }}>
                     {m.rank ? `#${m.rank}` : '-'} {m.marketName}
                   </span>
                 </div>
                 {m.isPrimary && (
                   <span style={{ fontSize: 9, background: 'var(--accent-primary)', color: '#fff', padding: '2px 4px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em' }}>PRIMARY</span>
                 )}
                 <div style={{ marginLeft: 'auto' }}>
                    {m.sendStatus !== 'PENDING' && (
                      <span style={{ fontSize: 10, color: c.textMuted }}>{m.sendStatus}</span>
                    )}
                 </div>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: c.textSecondary }}>
                  <span>{m.appetiteOutcome || "No appetite"}</span>
                  <span style={{ fontWeight: 600, color: c.textPrimary }}>
                    {m.generatedRate != null ? `$${m.generatedRate.toLocaleString()}` : '—'}
                  </span>
               </div>

               {(m.sendAttemptCount > 0 || m.lastSendError || m.assignedUnderwriter) && (
                 <div style={{ fontSize: 10, color: m.lastSendError ? '#ef4444' : c.textMuted, marginTop: 'auto', borderTop: `1px solid ${c.borderColor}`, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                   {m.lastSendError ? (
                     <span title={m.lastSendError} style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                       Err: {m.lastSendError}
                     </span>
                   ) : m.sendAttemptCount > 0 ? (
                     <span>Attempts: {m.sendAttemptCount}</span>
                   ) : null}
                   {m.assignedUnderwriter && (
                      <span title={m.assignedUnderwriter.email}>
                        UW: {m.assignedUnderwriter.name}
                      </span>
                   )}
                 </div>
               )}
             </button>
           );
        })}
      </div>
    </div>
  );
}
