import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { CorrespondenceMessage, CorrespondenceCapabilities } from "./types";
import { AlertCircle, Lock, X, Clock, FileWarning, HelpCircle, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

  // To prevent async race overwrites when switching dialogs
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMessages = useCallback(async () => {
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
      const res = await api.get<{ messages: CorrespondenceMessage[] }>(
        `/deal-card/correspondence/held`,
        { signal: ac.signal }
      );
      if (ac.signal.aborted) return;
      setMessages(res.messages || []);
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

  useEffect(() => {
    fetchMessages();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [isOpen, fetchMessages]);

  const handleRetryBody = async (messageId: string) => {
    try {
      await api.post(`/deal-card/correspondence/inbound/${messageId}/retry-body`, {});
      fetchMessages();
    } catch (err) {
      fetchMessages();
    }
  };

  const handleRelease = async (messageId: string, channel: string) => {
    try {
      await api.post(`/deal-card/correspondence/held/${messageId}/release`, {
        channel,
        senderConfirmed: true
      });
      fetchMessages();
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
                Held Correspondence
              </DialogTitle>
              <DialogDescription style={{ fontSize: 13, color: c.textSecondary, marginTop: 4 }}>
                Review queue for unauthorized, mixed-audience, or ambiguous inbound mail.
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HeldMessageItem({ message, onRetry, onRelease, c }: { message: CorrespondenceMessage; onRetry: (id: string) => void; onRelease: (id: string, channel: string) => void; c: any }) {
  const [senderConfirmed, setSenderConfirmed] = useState(false);
  const date = message.receivedAt || message.sentAt;
  const timeLabel = date ? new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  
  return (
    <div style={{
      background: c.cardBg,
      border: `1px solid var(--accent-support)`,
      borderRadius: 10,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>
            {message.from.name || message.from.email}
          </div>
          {message.subject && (
            <div style={{ fontSize: 12, fontWeight: 500, color: c.textSecondary }}>
              Subject: {message.subject}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: c.textMuted }}>{timeLabel}</span>
        </div>
      </div>

      <div style={{ fontSize: 11, color: c.textMuted, display: "flex", flexDirection: "column" }}>
        <span>From: {message.from.email}</span>
        <span>To: {message.to.join(", ")}</span>
        {message.cc && message.cc.length > 0 && <span>CC: {message.cc.join(", ")}</span>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ color: "var(--accent-support)", fontWeight: 600 }}>Channel: {message.channel || "UNKNOWN"}</span>
          <span style={{ color: c.textSecondary, fontWeight: 500, paddingLeft: 8, borderLeft: `1px solid ${c.borderColor}` }}>Deal: {message.dealId}</span>
        </div>
      </div>

      <div style={{ marginTop: 4 }}>
        {message.enrichment === "PENDING" ? (
          <div style={{ fontSize: 12, color: c.textMuted, display: "flex", alignItems: "center", gap: 6, fontStyle: "italic" }}>
            <Clock style={{ width: 14, height: 14 }} /> Retrieving message body...
          </div>
        ) : message.enrichment === "FAILED" ? (
          <div style={{ fontSize: 12, color: "#ef4444", display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "rgba(239, 68, 68, 0.1)", borderRadius: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileWarning style={{ width: 14, height: 14 }} /> Failed to retrieve full message body from provider.
            </div>
            <button
              onClick={() => onRetry(message.id)}
              style={{
                alignSelf: "flex-start", background: "#ef4444", color: "#fff", border: "none", borderRadius: 4,
                padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer"
              }}
            >
              Retry Retrieval
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: c.textPrimary, lineHeight: 1.5, whiteSpace: "pre-wrap", display: "flex", flexDirection: "column", gap: 8 }}>
            {message.bodyText || <span style={{ fontStyle: "italic", color: c.textMuted }}>(Empty message)</span>}
          </div>
        )}
      </div>

      {message.isReleasable && message.candidate && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${c.borderColor}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: "var(--accent-support)", display: "flex", alignItems: "flex-start", gap: 6 }}>
            <ShieldAlert style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Verify Sender:</strong> This message was matched to {message.candidate.marketName || message.candidate.channel} but could not be cryptographically authenticated. 
              Please manually verify the sender's address ({message.from.email}) is legitimate before releasing to the thread.
            </span>
          </div>
          
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.textPrimary, cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={senderConfirmed} 
              onChange={(e) => setSenderConfirmed(e.target.checked)} 
              style={{ margin: 0, accentColor: "var(--accent-primary)" }}
            />
            I have manually verified that this sender ({message.from.email}) is authorized.
          </label>

          <button
            onClick={() => onRelease(message.id, message.candidate!.channel)}
            disabled={!senderConfirmed}
            style={{
              alignSelf: "flex-start", background: senderConfirmed ? "var(--gradient-cta)" : c.hoverBg, color: senderConfirmed ? "#fff" : c.textMuted, border: "none", borderRadius: 6,
              padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: senderConfirmed ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6
            }}
          >
            <Lock style={{ width: 14, height: 14 }} /> Release to {message.candidate.marketName || message.candidate.channel}
          </button>
        </div>
      )}
    </div>
  );
}
