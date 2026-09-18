import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { CorrespondenceMessage, CorrespondenceCapabilities } from "./types";
import { AlertCircle, RefreshCw, Send, Lock, Clock, Mail, CheckCircle2, AlertTriangle, FileWarning, EyeOff, ShieldAlert } from "lucide-react";
import { STATUS_COLORS } from "./icons";

interface MarketCorrespondenceViewProps {
  dealId: string;
  dealMarketId: string;
  marketName: string;
  capabilities: CorrespondenceCapabilities | null;
}

export default function MarketCorrespondenceView({ dealId, dealMarketId, marketName, capabilities }: MarketCorrespondenceViewProps) {
  const c = useThemeColors();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CorrespondenceMessage[]>([]);
  const [marketInfo, setMarketInfo] = useState<{ contact: { name: string | null; email: string } } | null>(null);

  // Draft state (In-memory only to prevent shared device leakage)
  const [draftSubject, setDraftSubject] = useState("");
  const [draftText, setDraftText] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // To prevent async race overwrites when switching markets
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMessages = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    if (!capabilities?.market.canRead) {
      setError("You do not have permission to view this market's correspondence.");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ market: any; messages: CorrespondenceMessage[] }>(
        `/deal-card/${dealId}/correspondence/market/${dealMarketId}`,
        { signal: ac.signal }
      );
      if (ac.signal.aborted) return;
      setMessages(res.messages || []);
      setMarketInfo(res.market);
    } catch (err: any) {
      if (ac.signal.aborted) return;
      if (err.status === 403) {
        setError("You do not have permission to view this market's correspondence.");
      } else {
        setError("Failed to load market correspondence.");
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [dealId, dealMarketId, capabilities]);

  useEffect(() => {
    fetchMessages();
    
    const handleReleased = (e: any) => {
      const detail = e.detail || e.data;
      if (detail && detail.dealId === dealId) {
        fetchMessages();
      }
    };
    const onFocus = () => fetchMessages();
    
    window.addEventListener("focus", onFocus);
    window.addEventListener("held_message_released", handleReleased);
    const bc = new BroadcastChannel("held_message_released");
    bc.onmessage = (e) => handleReleased(e);
    
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("held_message_released", handleReleased);
      bc.close();
    };
  }, [dealId, fetchMessages]);

  const handleSend = async () => {
    if (!draftText.trim() || !capabilities?.market.canSend) return;
    setSending(true);
    setSendError(null);
    try {
      await api.post(`/deal-card/${dealId}/correspondence/market/${dealMarketId}`, {
        subject: draftSubject || `Update regarding ${marketName}`,
        text: draftText,
        requestId,
      });
      setDraftText("");
      setDraftSubject("");
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

  const handleRetryBody = async (messageId: string) => {
    try {
      await api.post(`/deal-card/${dealId}/correspondence/inbound/${messageId}/retry-body`, {});
      fetchMessages();
    } catch (err) {
      // Refresh to show FAILED state if it failed again
      fetchMessages();
    }
  };

  if (loading && messages.length === 0) {
    return <div style={{ fontSize: 13, color: c.textMuted, padding: 20, textAlign: "center" }}>Loading correspondence...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20, background: c.hoverBg, border: `1px solid ${c.borderColor}`, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Lock style={{ width: 24, height: 24, color: c.textMuted }} />
        <span style={{ fontSize: 13, color: c.textSecondary, textAlign: "center" }}>{error}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Info */}
      {marketInfo && (
        <div style={{ background: c.bg, border: `1px dashed ${c.borderColor}`, borderRadius: 8, padding: 12, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <EyeOff style={{ width: 16, height: 16, color: "var(--accent-primary)", marginTop: 2 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>Private Market Correspondence</span>
            <span style={{ fontSize: 12, color: c.textSecondary }}>
              This conversation is visible only to Axel Admins and CSAs. Messages are sent directly to the verified market contact.
            </span>
            <div style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>
              <strong>Contact:</strong> {marketInfo.contact?.name ? `${marketInfo.contact.name} (${marketInfo.contact.email})` : marketInfo.contact?.email || 'Unknown'}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{ fontSize: 12, color: c.textMuted, padding: "20px 0", textAlign: "center" }}>No messages yet.</div>
        ) : (
          messages.map(msg => (
            <MessageItem key={msg.id} message={msg} onRetry={handleRetryBody} c={c} />
          ))
        )}
      </div>

      {/* Composer */}
      {capabilities?.market.canSend && (
        <div style={{ background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
            <Mail style={{ width: 14, height: 14 }} /> New Message to {marketName}
          </div>
          
          <input
            value={draftSubject}
            onChange={(e) => setDraftSubject(e.target.value)}
            placeholder={`Subject (defaults to: Update regarding ${marketName})`}
            style={{
              width: "100%", background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 6,
              padding: "8px 12px", fontSize: 13, color: c.textPrimary, fontFamily: "inherit"
            }}
            disabled={sending}
          />
          
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder={`Type your message to ${marketInfo?.contact?.email || marketName}...`}
            style={{
              width: "100%", minHeight: 100, background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 6,
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
                <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>Confirm send to {marketInfo?.contact?.email || marketName}?</span>
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
                disabled={!draftText.trim() || sending}
                style={{
                  display: "flex", alignItems: "center", gap: 6, background: "var(--accent-primary)", color: "#fff",
                  border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  cursor: (!draftText.trim() || sending) ? "default" : "pointer", opacity: (!draftText.trim() || sending) ? 0.6 : 1
                }}
              >
                <Send style={{ width: 14, height: 14 }} />
                Send to Market
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageItem({ message, onRetry, c }: { message: CorrespondenceMessage; onRetry: (id: string) => void; c: any }) {
  const isInbound = message.direction === "INBOUND";
  const date = message.receivedAt || message.sentAt;
  const timeLabel = date ? new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  
  return (
    <div style={{
      background: isInbound ? c.cardBg : c.bg,
      border: `1px solid ${c.borderColor}`,
      borderRadius: 10,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginLeft: isInbound ? 0 : 24,
      marginRight: isInbound ? 24 : 0,
      borderLeft: isInbound ? `3px solid var(--accent-primary)` : `1px solid ${c.borderColor}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>
            {isInbound ? (message.from.name || message.from.email) : "Axel Staff"}
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
        {isInbound && <span>From: {message.from.email}</span>}
        <span>To: {message.to.join(", ")}</span>
        {message.cc && message.cc.length > 0 && <span>CC: {message.cc.join(", ")}</span>}
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
