import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { CorrespondenceMessage, CorrespondenceCapabilities } from "./types";
import { AlertCircle, RefreshCw, Send, Lock, X, MessageSquare, CheckCircle2, AlertTriangle, User, ShieldAlert, Clock } from "lucide-react";
import { STATUS_COLORS } from "./icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface BrokerCorrespondenceDialogProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  capabilities: CorrespondenceCapabilities | null;
}

export default function BrokerCorrespondenceDialog({ dealId, isOpen, onClose, capabilities }: BrokerCorrespondenceDialogProps) {
  const c = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CorrespondenceMessage[]>([]);
  
  // Recipient selection
  const agents = capabilities?.broker.eligibleRecipients || [];
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents.length === 1 ? agents[0].userId : "");

  // Draft state (In-memory only to prevent shared device leakage, isolated per recipient)
  const [drafts, setDrafts] = useState<Record<string, { subject: string; text: string }>>({});
  
  // Current draft derives from the selected agent (or "reply" if they can only reply to their own thread)
  const currentDraftKey = capabilities?.broker.canSend ? selectedAgentId : "reply";
  const draftSubject = drafts[currentDraftKey]?.subject || "";
  const draftText = drafts[currentDraftKey]?.text || "";

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  // To prevent async race overwrites when switching dialogs
  const abortControllerRef = useRef<AbortController | null>(null);

  const setDraft = (subj: string, text: string) => {
    if (!currentDraftKey) return;
    setDrafts(prev => ({
      ...prev,
      [currentDraftKey]: { subject: subj, text }
    }));
  };

  const fetchMessages = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    if (!isOpen || !capabilities?.broker.canRead) {
      if (isOpen) setError("You do not have permission to view broker correspondence.");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ messages: CorrespondenceMessage[] }>(
        `/deal-card/${dealId}/correspondence/broker`,
        { signal: ac.signal }
      );
      if (ac.signal.aborted) return;
      setMessages(res.messages || []);
    } catch (err: any) {
      if (ac.signal.aborted) return;
      if (err.status === 403) {
        setError("You do not have permission to view broker correspondence.");
      } else {
        setError("Failed to load broker correspondence.");
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [dealId, isOpen, capabilities]);

  useEffect(() => {
    fetchMessages();
    if (isOpen) {
      setSendError(null);
      setConfirming(false);
      if (agents.length === 1 && !selectedAgentId) {
        setSelectedAgentId(agents[0].userId);
      }
    }
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [isOpen, fetchMessages, agents]);

  const handleSend = async () => {
    const canSend = capabilities?.broker.canSend;
    const canReply = capabilities?.broker.canReply;
    if (!draftText.trim()) return;
    if (!canSend && !canReply) return;
    if (canSend && !selectedAgentId) return;

    setSending(true);
    setSendError(null);
    try {
      if (canSend) {
        await api.post(`/deal-card/${dealId}/correspondence/broker`, {
          recipientUserId: selectedAgentId,
          subject: draftSubject || "Update regarding your submission",
          text: draftText,
          requestId,
        });
      } else {
        await api.post(`/deal-card/${dealId}/correspondence/broker/reply`, {
          subject: draftSubject || "Reply",
          text: draftText,
        });
      }
      setDraft("", "");
      setRequestId(crypto.randomUUID());
      setConfirming(false);
      fetchMessages();
    } catch (err: any) {
      setSendError(err.message || "Failed to send message. Please try again.");
      let rotate = false;
      if (err.name === "ApiError") {
        if (err.status >= 400 && err.status < 500) {
          rotate = true;
        } else if (err.deliveryState === 'failed') {
          rotate = true;
        }
      }
      if (rotate) {
        setRequestId(crypto.randomUUID());
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: 700, maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 0, gap: 0, overflow: "hidden", background: c.bg, border: `1px solid ${c.borderColor}` }}>
        <DialogHeader style={{ padding: "16px 20px", borderBottom: `1px solid ${c.borderColor}`, background: c.cardBg, margin: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <DialogTitle style={{ fontSize: 16, fontWeight: 600, color: c.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare style={{ width: 18, height: 18, color: "var(--accent-primary)" }} />
                Broker Correspondence
              </DialogTitle>
              <DialogDescription style={{ fontSize: 13, color: c.textSecondary, marginTop: 4 }}>
                {capabilities?.broker.canSend 
                  ? "Communicate securely with the broker. This thread is separate from market communications."
                  : "Secure messages from Axel regarding this deal."}
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
            <div style={{ fontSize: 13, color: c.textMuted, textAlign: "center", padding: 40 }}>No broker messages yet.</div>
          ) : (
            messages.map(msg => (
              <BrokerMessageItem key={msg.id} message={msg} c={c} />
            ))
          )}
        </div>

        {(capabilities?.broker.canSend || capabilities?.broker.canReply) && !error && (
          <div style={{ padding: 20, borderTop: `1px solid ${c.borderColor}`, background: c.cardBg, display: "flex", flexDirection: "column", gap: 12 }}>
            {capabilities?.broker.canSend && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary, width: 60 }}>To:</span>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: `1px solid ${c.borderColor}`, background: c.bg, color: c.textPrimary, fontSize: 13 }}
                  disabled={sending}
                >
                  <option value="" disabled>Select an agent...</option>
                  {agents.map(a => (
                    <option key={a.userId} value={a.userId}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </div>
            )}
            
            <input
              value={draftSubject}
              onChange={(e) => setDraft(e.target.value, draftText)}
              placeholder="Subject..."
              style={{
                width: "100%", background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 6,
                padding: "8px 12px", fontSize: 13, color: c.textPrimary, fontFamily: "inherit"
              }}
              disabled={sending}
            />
            
            <textarea
              value={draftText}
              onChange={(e) => setDraft(draftSubject, e.target.value)}
              placeholder="Type your message to the broker..."
              style={{
                width: "100%", minHeight: 80, background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 6,
                padding: "10px 12px", fontSize: 13, color: c.textPrimary, fontFamily: "inherit", resize: "vertical"
              }}
              disabled={sending}
            />

            {sendError && (
              <div style={{ fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle style={{ width: 14, height: 14 }} /> {sendError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {confirming ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(239, 68, 68, 0.1)", border: `1px solid rgba(239, 68, 68, 0.3)`, padding: "8px 12px", borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                    Confirm {capabilities?.broker.canSend ? `send to ${agents.find(a => a.userId === selectedAgentId)?.name || 'broker'}` : 'reply'}?
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setConfirming(false)} disabled={sending} style={{ fontSize: 11, background: "none", border: `1px solid ${c.borderColor}`, color: c.textSecondary, borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleSend} disabled={sending} style={{ fontSize: 11, background: "#ef4444", border: "none", color: "#fff", borderRadius: 4, padding: "4px 8px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      {sending && <RefreshCw style={{ width: 12, height: 12 }} className="animate-spin" />}
                      Confirm Send
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  disabled={!draftText.trim() || (capabilities?.broker.canSend && !selectedAgentId) || sending}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, background: "var(--accent-primary)", color: "#fff",
                    border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                    cursor: (!draftText.trim() || (capabilities?.broker.canSend && !selectedAgentId) || sending) ? "default" : "pointer", 
                    opacity: (!draftText.trim() || (capabilities?.broker.canSend && !selectedAgentId) || sending) ? 0.6 : 1
                  }}
                >
                  <Send style={{ width: 14, height: 14 }} />
                  {capabilities?.broker.canSend ? "Send to Broker" : "Reply to Thread"}
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BrokerMessageItem({ message, c }: { message: CorrespondenceMessage; c: any }) {
  const isInbound = message.direction === "INBOUND"; // from broker
  const date = message.receivedAt || message.sentAt;
  const timeLabel = date ? new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  
  return (
    <div style={{
      background: isInbound ? c.cardBg : c.bg,
      border: `1px solid ${c.borderColor}`,
      borderRadius: 10,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginLeft: isInbound ? 0 : 32,
      marginRight: isInbound ? 32 : 0,
      borderLeft: isInbound ? `3px solid var(--accent-primary)` : `1px solid ${c.borderColor}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
            <User style={{ width: 14, height: 14, color: c.textMuted }} />
            {isInbound ? (message.from.name || message.from.email || "Broker") : "Axel"}
          </div>
          {message.subject && (
            <div style={{ fontSize: 12, fontWeight: 500, color: c.textSecondary }}>
              Subject: {message.subject}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: c.textMuted }}>{timeLabel}</span>
          {!isInbound && message.deliveryState && (
            <DeliveryStatus state={message.deliveryState} c={c} />
          )}
        </div>
      </div>

      <div style={{ fontSize: 11, color: c.textMuted, display: "flex", flexDirection: "column" }}>
        <span>To: {message.to.join(", ")}</span>
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 13, color: c.textPrimary, lineHeight: 1.5, whiteSpace: "pre-wrap", display: "flex", flexDirection: "column", gap: 8 }}>
          {message.bodyText || <span style={{ fontStyle: "italic", color: c.textMuted }}>(Empty message)</span>}
        </div>
      </div>
    </div>
  );
}

function DeliveryStatus({ state, c }: { state: string; c: any }) {
  if (state === "sent") {
    return <span title="Sent" style={{ color: STATUS_COLORS.complete, display: "flex", alignItems: "center" }}><CheckCircle2 style={{ width: 14, height: 14 }} /></span>;
  }
  if (state === "failed") {
    return <span title="Failed to deliver" style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle style={{ width: 14, height: 14 }} /> Failed</span>;
  }
  if (state === "dev_logged") {
    return <span title="Logged in Dev" style={{ color: c.textMuted, display: "flex", alignItems: "center" }}><CheckCircle2 style={{ width: 14, height: 14 }} /></span>;
  }
  if (state === "PENDING") {
    return <span title="Sending..." style={{ color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: 4 }}><Clock style={{ width: 14, height: 14 }} /> Sending</span>;
  }
  if (state === "DELIVERY_UNKNOWN") {
    return <span title="Delivery Unknown" style={{ color: "var(--accent-support)", display: "flex", alignItems: "center", gap: 4 }}><AlertCircle style={{ width: 14, height: 14 }} /> Unknown</span>;
  }
  return null;
}
