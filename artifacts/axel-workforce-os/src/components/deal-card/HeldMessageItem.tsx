import { useState, useEffect } from "react";
import { CorrespondenceMessage } from "./types";
import { Clock, FileWarning, ShieldAlert, Lock } from "lucide-react";

export function HeldMessageItem({
  message,
  onRetry,
  onRelease,
  busy = false,
  c,
}: {
  message: CorrespondenceMessage;
  onRetry: (id: string) => void;
  onRelease: (id: string, channel: string) => void;
  busy?: boolean;
  c: any;
}) {
  const [senderConfirmed, setSenderConfirmed] = useState(false);

  useEffect(() => {
    setSenderConfirmed(false);
  }, [message.id, message.candidate?.channel, message.candidate?.contactEmail]);
  
  const date = message.receivedAt || message.sentAt;
  const timeLabel = date
    ? new Date(date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      style={{
        background: c.cardBg,
        border: `1px solid var(--accent-support)`,
        borderRadius: 10,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
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
          <span style={{ color: "var(--accent-support)", fontWeight: 600 }}>
            Channel: {message.channel || "UNKNOWN"}
          </span>
          {message.dealId && <span style={{ color: c.textSecondary, fontWeight: 500, paddingLeft: 8, borderLeft: `1px solid ${c.borderColor}` }}>
            Deal: {message.dealName || message.dealId}
          </span>}
          {message.threadLabel && <span style={{ color: c.textSecondary, fontWeight: 500, paddingLeft: 8, borderLeft: `1px solid ${c.borderColor}` }}>
            Thread: {message.threadLabel}
          </span>}
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
              disabled={busy}
              style={{
                alignSelf: "flex-start",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
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
              disabled={busy}
              onChange={(e) => setSenderConfirmed(e.target.checked)}
              style={{ margin: 0, accentColor: "var(--accent-primary)" }}
            />
            I have manually verified that this sender ({message.from.email}) is authorized.
          </label>

          <button
            onClick={() => onRelease(message.id, message.candidate!.channel)}
            disabled={!senderConfirmed || busy}
            style={{
              alignSelf: "flex-start",
              background: senderConfirmed ? "var(--gradient-cta)" : c.hoverBg,
              color: senderConfirmed ? "#fff" : c.textMuted,
              border: "none",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: senderConfirmed ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Lock style={{ width: 14, height: 14 }} /> Release to {message.candidate.marketName || message.candidate.channel}
          </button>
        </div>
      )}
    </div>
  );
}
