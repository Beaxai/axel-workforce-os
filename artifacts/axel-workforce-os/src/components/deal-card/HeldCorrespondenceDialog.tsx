import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { CorrespondenceMessage, CorrespondenceCapabilities } from "./types";
import { AlertCircle, Lock, X, Clock, FileWarning, HelpCircle, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HeldMessageItem } from "./HeldMessageItem";

interface HeldCorrespondenceDialogProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  capabilities: CorrespondenceCapabilities | null;
}

export default function HeldCorrespondenceDialog({ dealId, isOpen, onClose, capabilities }: HeldCorrespondenceDialogProps) {
  const c = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CorrespondenceMessage[]>([]);
  const [counts, setCounts] = useState<{all: number, matched: number, unmatched: number}>({all: 0, matched: 0, unmatched: 0});
  const [total, setTotal] = useState(0);
  const offsetRef = useRef(0);
  const LIMIT = 50;

  // To prevent async race overwrites when switching dialogs
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMessages = useCallback(async (isLoadMore = false) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    if (!isOpen || !capabilities?.market.canReviewHeld) {
      if (isOpen) setError("You do not have permission to view held correspondence.");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (!isLoadMore) offsetRef.current = 0;
      const currentOffset = offsetRef.current;
      const currentLimit = LIMIT;
      
      const res = await api.get<{ messages: CorrespondenceMessage[], total: number, counts: any }>(
        `/deal-card/${dealId}/correspondence/held?filter=all&limit=${currentLimit}&offset=${currentOffset}`,
        { signal: ac.signal }
      );
      if (ac.signal.aborted) return;
      
      if (isLoadMore) {
        setMessages(prev => {
          const newIds = new Set(res.messages.map(m => m.id));
          const filteredPrev = prev.filter(m => !newIds.has(m.id));
          return [...filteredPrev, ...res.messages];
        });
      } else {
        setMessages(res.messages || []);
      }
      
      setTotal(res.total || 0);
      setCounts(res.counts || {all: 0, matched: 0, unmatched: 0});
      offsetRef.current = currentOffset + res.messages.length;
    } catch (err: any) {
      if (ac.signal.aborted) return;
      if (err.status === 403) {
        setError("You do not have permission to view held correspondence.");
      } else {
        setError("Failed to load held correspondence.");
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [dealId, isOpen, capabilities]);

  // Clear state on hide or denied to protect private data
  useEffect(() => {
    if (!isOpen || !capabilities?.market.canReviewHeld) {
      setMessages([]);
      setTotal(0);
      setCounts({all: 0, matched: 0, unmatched: 0});
      offsetRef.current = 0;
      setError(null);
    }
  }, [isOpen, capabilities?.market.canReviewHeld, dealId]);

  useEffect(() => {
    if (isOpen && capabilities?.market.canReviewHeld) {
      fetchMessages(false);
    }
    
    const handleReleased = (e: any) => {
      const dealIdDetail = e.detail?.dealId || e.data?.dealId;
      if (!dealIdDetail || dealIdDetail === dealId) {
        if (isOpen && capabilities?.market.canReviewHeld) fetchMessages(false);
      }
    };
    
    const onFocus = () => { if (isOpen && capabilities?.market.canReviewHeld) fetchMessages(false); };
    
    window.addEventListener("focus", onFocus);
    window.addEventListener("held_message_released", handleReleased);
    const bc = new BroadcastChannel("held_message_released");
    bc.onmessage = (e) => handleReleased(e);
    
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("held_message_released", handleReleased);
      bc.close();
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [isOpen, capabilities?.market.canReviewHeld, fetchMessages, dealId]);

  const handleRetryBody = async (messageId: string) => {
    try {
      await api.post(`/deal-card/correspondence/inbound/${messageId}/retry-body`, {});
      fetchMessages(false);
    } catch (err) {
      fetchMessages(false);
    }
  };

  const handleRelease = async (messageId: string, channel: string) => {
    try {
      await api.post(`/deal-card/correspondence/held/${messageId}/release`, {
        channel,
        senderConfirmed: true
      });
      fetchMessages(false);
      // Need a way to refresh OverviewTab activity and correspondence. 
      // Firing a custom event for "message_released"
      window.dispatchEvent(new CustomEvent("held_message_released", { detail: { dealId } }));
      const bc = new BroadcastChannel("held_message_released");
      bc.postMessage({ dealId });
      bc.close();
    } catch (err: any) {
      setError(err.message || "Failed to release message.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: 700, maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 0, gap: 0, overflow: "hidden", background: c.bg, border: `1px solid ${c.borderColor}` }}>
        <DialogHeader style={{ padding: "16px 20px", borderBottom: `1px solid ${c.borderColor}`, background: c.cardBg, margin: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <DialogTitle style={{ fontSize: 16, fontWeight: 600, color: c.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                <HelpCircle style={{ width: 18, height: 18, color: "var(--accent-primary)" }} />
                Held Correspondence ({total})
              </DialogTitle>
              <DialogDescription style={{ fontSize: 13, color: c.textSecondary, marginTop: 4 }}>
                Review queue for unauthorized, mixed-audience, or ambiguous inbound mail for this deal.
              </DialogDescription>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: c.textMuted }}>
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </DialogHeader>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && messages.length === 0 ? (
            <div style={{ fontSize: 13, color: c.textMuted, textAlign: "center", padding: 40 }}>Loading messages...</div>
          ) : error ? (
            <div style={{ padding: 20, background: c.hoverBg, border: `1px solid ${c.borderColor}`, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Lock style={{ width: 24, height: 24, color: c.textMuted }} />
              <span style={{ fontSize: 13, color: c.textSecondary, textAlign: "center" }}>{error}</span>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ fontSize: 13, color: c.textMuted, textAlign: "center", padding: 40 }}>No held messages.</div>
          ) : (
            messages.map(msg => (
              <HeldMessageItem key={msg.id} message={msg} onRetry={handleRetryBody} onRelease={handleRelease} c={c} />
            ))
          )}

          {messages.length > 0 && messages.length < total && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button
                onClick={() => fetchMessages(true)}
                disabled={loading}
                style={{
                  background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 8,
                  padding: "8px 24px", fontSize: 13, fontWeight: 600, color: c.textPrimary,
                  cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? "Loading more..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

  );
}
