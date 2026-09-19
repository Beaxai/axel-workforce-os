import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { CorrespondenceMessage } from "./types";
import { AlertTriangle, CheckCircle2, Link2, Loader2, Search, X } from "lucide-react";

interface MatchCandidate {
  dealId: string;
  dealName: string;
  dealMarketId: string | null;
  threadId: string;
  channel: "MARKET" | "BROKER";
  listenerEmail: string;
  senderEmail: string;
  providerReceivedEmailId: string;
  evidenceSummary: string[];
  confirmationToken: string;
}

interface MatchPreviewResponse {
  candidate: MatchCandidate;
}

interface MatchResponse {
  associated: true;
  messageId: string;
  dealId: string;
  channel: "HELD";
}

export function UnmatchedHeldMatchPanel({
  message,
  c,
  onAssociated,
}: {
  message: CorrespondenceMessage;
  c: any;
  onAssociated: (result: MatchResponse) => void;
}) {
  const [candidate, setCandidate] = useState<MatchCandidate | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [associating, setAssociating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const previewInFlightRef = useRef<object | null>(null);
  const associateInFlightRef = useRef<object | null>(null);

  const identityKey = useMemo(
    () =>
      JSON.stringify({
        id: message.id,
        from: message.from.email,
        receivedAt: message.receivedAt,
        threadId: message.threadId,
        subject: message.subject,
        to: message.to,
        cc: message.cc,
      }),
    [message.id, message.from.email, message.receivedAt, message.threadId, message.subject, message.to, message.cc],
  );

  useEffect(() => {
    generationRef.current += 1;
    previewInFlightRef.current = null;
    associateInFlightRef.current = null;
    setCandidate(null);
    setConfirmed(false);
    setError(null);
    setPreviewing(false);
    setAssociating(false);
    return () => {
      generationRef.current += 1;
      previewInFlightRef.current = null;
      associateInFlightRef.current = null;
    };
  }, [identityKey]);

  const checkDestination = async () => {
    if (previewInFlightRef.current || associateInFlightRef.current) return;
    const operation = {};
    const generation = generationRef.current;
    previewInFlightRef.current = operation;
    setPreviewing(true);
    setError(null);
    setCandidate(null);
    setConfirmed(false);

    try {
      const response = await api.post<MatchPreviewResponse>(
        `/deal-card/correspondence/held/${message.id}/match-preview`,
        {},
      );
      if (generationRef.current !== generation || previewInFlightRef.current !== operation) return;
      const next = response.candidate;
      if (
        !next?.dealId ||
        !next.dealName ||
        !next.threadId ||
        !next.listenerEmail ||
        !next.senderEmail ||
        !next.providerReceivedEmailId ||
        !next.confirmationToken ||
        !["MARKET", "BROKER"].includes(next.channel) ||
        !Array.isArray(next.evidenceSummary) ||
        next.evidenceSummary.length === 0
      ) {
        throw new Error("Verified destination evidence is unavailable for this message.");
      }
      setCandidate(next);
    } catch (err: any) {
      if (generationRef.current !== generation || previewInFlightRef.current !== operation) return;
      if (err.status === 404 || err.status === 422) {
        setError("No safe, unambiguous destination evidence is available for this message.");
      } else {
        setError(err.message || "Unable to verify a destination for this message.");
      }
    } finally {
      if (previewInFlightRef.current === operation) {
        previewInFlightRef.current = null;
        if (generationRef.current === generation) setPreviewing(false);
      }
    }
  };

  const associate = async () => {
    if (!candidate || !confirmed || previewInFlightRef.current || associateInFlightRef.current) return;
    const operation = {};
    const generation = generationRef.current;
    associateInFlightRef.current = operation;
    setAssociating(true);
    setError(null);

    try {
      const result = await api.post<MatchResponse>(
        `/deal-card/correspondence/held/${message.id}/match`,
        {
          confirmationToken: candidate.confirmationToken,
          destinationConfirmed: true,
        },
      );
      if (generationRef.current !== generation || associateInFlightRef.current !== operation) return;
      onAssociated(result);
    } catch (err: any) {
      if (generationRef.current !== generation || associateInFlightRef.current !== operation) return;
      if (err.status === 409) {
        setCandidate(null);
        setConfirmed(false);
        setError("The message or destination changed. Check the destination again before associating.");
      } else {
        setError(err.message || "Failed to associate this held message.");
      }
    } finally {
      if (associateInFlightRef.current === operation) {
        associateInFlightRef.current = null;
        if (generationRef.current === generation) setAssociating(false);
      }
    }
  };

  const cancel = () => {
    if (previewInFlightRef.current || associateInFlightRef.current) return;
    generationRef.current += 1;
    setCandidate(null);
    setConfirmed(false);
    setError(null);
  };

  if (!candidate) {
    return (
      <div
        data-testid={`panel-match-destination-${message.id}`}
        style={{
          marginTop: 8,
          padding: 12,
          background: c.cardBg,
          border: `1px dashed ${c.borderColor}`,
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div data-testid={`text-unmatched-guidance-${message.id}`} style={{ fontSize: 12, color: c.textSecondary }}>
          This message is not associated with a deal. Check for a single destination supported by provider and listener evidence.
        </div>
        {error && (
          <div
            role="alert"
            data-testid={`status-match-error-${message.id}`}
            style={{ fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}
          >
            <AlertTriangle aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0 }} />
            {error}
          </div>
        )}
        <button
          type="button"
          data-testid={`button-check-destination-${message.id}`}
          onClick={checkDestination}
          disabled={previewing}
          style={{
            background: previewing ? c.hoverBg : c.bg,
            border: `1px solid ${c.borderColor}`,
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            color: previewing ? c.textMuted : c.textPrimary,
            cursor: previewing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {previewing ? (
            <Loader2 aria-hidden="true" style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
          ) : (
            <Search aria-hidden="true" style={{ width: 14, height: 14, color: "var(--accent-primary)" }} />
          )}
          {previewing ? "Checking destination..." : "Check destination"}
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid={`panel-match-preview-${message.id}`}
      style={{
        marginTop: 8,
        padding: 14,
        background: c.cardBg,
        border: `1px solid ${c.borderColor}`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: c.textPrimary }}>
        <Link2 aria-hidden="true" style={{ width: 16, height: 16, color: "var(--accent-primary)" }} />
        Confirm held-message destination
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        <div style={{ padding: 10, borderRadius: 7, background: c.bg, border: `1px solid ${c.borderColor}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.textMuted, textTransform: "uppercase" }}>Destination deal</div>
          <div data-testid={`text-candidate-deal-${message.id}`} style={{ marginTop: 3, fontSize: 14, fontWeight: 700, color: c.textPrimary }}>
            {candidate.dealName}
          </div>
          <div data-testid={`text-candidate-deal-id-${message.id}`} style={{ marginTop: 2, fontSize: 11, color: c.textMuted, overflowWrap: "anywhere" }}>
            Deal ID: {candidate.dealId}
          </div>
          <div data-testid={`text-candidate-channel-${message.id}`} style={{ marginTop: 2, fontSize: 12, color: c.textSecondary }}>
            {candidate.channel} · listener {candidate.listenerEmail}
          </div>
        </div>
        <div style={{ padding: 10, borderRadius: 7, background: c.bg, border: `1px solid ${c.borderColor}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.textMuted, textTransform: "uppercase" }}>Actual sender</div>
          <div data-testid={`text-actual-sender-${message.id}`} style={{ marginTop: 3, fontSize: 14, fontWeight: 700, color: c.textPrimary, overflowWrap: "anywhere" }}>
            {candidate.senderEmail}
          </div>
        </div>
      </div>

      <div
        data-testid={`text-evidence-warning-${message.id}`}
        style={{ padding: 10, borderRadius: 7, background: "rgba(245, 158, 11, 0.1)", color: c.textPrimary, fontSize: 12, lineHeight: 1.45 }}
      >
        <strong>Destination evidence is not sender verification.</strong> Provider, listener, and thread evidence only identify where this message belongs. It does not establish that the sender is legitimate or authorized, and this action will not release the message.
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, marginBottom: 5 }}>Destination evidence</div>
        <ul data-testid={`list-match-evidence-${message.id}`} style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.5, color: c.textSecondary }}>
          {candidate.evidenceSummary.map((evidence, index) => (
            <li key={`${index}-${evidence}`}>{evidence}</li>
          ))}
        </ul>
      </div>

      {error && (
        <div role="alert" data-testid={`status-match-error-${message.id}`} style={{ fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0 }} />
          {error}
        </div>
      )}

      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: c.textPrimary, cursor: associating ? "default" : "pointer" }}>
        <input
          type="checkbox"
          data-testid={`checkbox-confirm-match-${message.id}`}
          checked={confirmed}
          disabled={associating}
          onChange={(event) => setConfirmed(event.target.checked)}
          style={{ margin: "2px 0 0", accentColor: "var(--accent-primary)" }}
        />
        I reviewed the destination deal, channel, listener, and actual sender shown above. I understand this only associates the message and keeps it held.
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          data-testid={`button-associate-held-${message.id}`}
          onClick={associate}
          disabled={!confirmed || associating || previewing}
          style={{
            background: confirmed && !associating ? "var(--gradient-cta)" : c.hoverBg,
            color: confirmed && !associating ? "#fff" : c.textMuted,
            border: "none",
            borderRadius: 6,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: confirmed && !associating ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {associating ? (
            <Loader2 aria-hidden="true" style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
          ) : (
            <CheckCircle2 aria-hidden="true" style={{ width: 14, height: 14 }} />
          )}
          {associating ? "Associating..." : "Associate and keep held"}
        </button>
        <button
          type="button"
          data-testid={`button-cancel-match-${message.id}`}
          onClick={cancel}
          disabled={associating || previewing}
          style={{
            background: "transparent",
            color: c.textSecondary,
            border: `1px solid ${c.borderColor}`,
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: associating || previewing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <X aria-hidden="true" style={{ width: 14, height: 14 }} />
          Cancel
        </button>
      </div>
    </div>
  );
}