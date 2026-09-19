import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Link2, SearchCheck } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { CorrespondenceMessage } from "./types";

type MatchCandidate = {
  dealId: string;
  dealName: string;
  channel: "MARKET" | "BROKER";
  dealMarketId: string | null;
  marketName: string | null;
  evidence: string[];
};

type MatchCandidateResponse = {
  candidate: MatchCandidate | null;
  unavailableReason: string | null;
};

type HeldMatchEvidenceProps = {
  message: CorrespondenceMessage;
  c: ReturnType<typeof useThemeColors>;
  onForbidden: () => void;
  onConnected: (dealId: string) => void;
};

export function HeldMatchEvidence({
  message,
  c,
  onForbidden,
  onConnected,
}: HeldMatchEvidenceProps) {
  const [candidate, setCandidate] = useState<MatchCandidate | null>(null);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [destinationConfirmed, setDestinationConfirmed] = useState(false);
  const evidenceRequestRef = useRef<AbortController | null>(null);
  const connectRequestRef = useRef<AbortController | null>(null);
  const connectingRef = useRef(false);
  const mountedRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    generationRef.current += 1;
    evidenceRequestRef.current?.abort();
    connectRequestRef.current?.abort();
    setCandidate(null);
    setUnavailableReason(null);
    setError(null);
    setChecking(false);
    setConnecting(false);
    setDestinationConfirmed(false);
    connectingRef.current = false;

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      evidenceRequestRef.current?.abort();
      connectRequestRef.current?.abort();
    };
  }, [message]);

  const checkEvidence = async () => {
    evidenceRequestRef.current?.abort();
    const ac = new AbortController();
    const generation = generationRef.current;
    evidenceRequestRef.current = ac;
    setChecking(true);
    setCandidate(null);
    setUnavailableReason(null);
    setError(null);
    setDestinationConfirmed(false);

    try {
      const result = await api.get<MatchCandidateResponse>(
        `/deal-card/correspondence/held/${message.id}/match-candidate`,
        { signal: ac.signal },
      );
      if (ac.signal.aborted || !mountedRef.current || generation !== generationRef.current) return;
      setCandidate(result.candidate);
      setUnavailableReason(result.candidate ? null : (result.unavailableReason || "No reliable matching evidence is currently available."));
    } catch (err) {
      if (ac.signal.aborted || !mountedRef.current || generation !== generationRef.current) return;
      if (err instanceof ApiError && err.status === 403) {
        onForbidden();
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to check matching evidence.");
    } finally {
      if (!ac.signal.aborted && mountedRef.current && generation === generationRef.current) {
        setChecking(false);
      }
    }
  };

  const connectToCandidate = async () => {
    if (!candidate || !destinationConfirmed || connectingRef.current) return;
    const destination = candidate;
    const generation = generationRef.current;
    const ac = new AbortController();
    connectRequestRef.current = ac;
    connectingRef.current = true;
    setConnecting(true);
    setError(null);

    try {
      const result = await api.post<{ matched: true }>(
        `/deal-card/correspondence/held/${message.id}/match`,
        {
          dealId: destination.dealId,
          channel: destination.channel,
          dealMarketId: destination.dealMarketId,
          destinationConfirmed: true,
        },
        { signal: ac.signal },
      );
      if (ac.signal.aborted || !mountedRef.current || generation !== generationRef.current) return;
      if (result.matched !== true) {
        throw new Error("The server did not confirm the match.");
      }
      onConnected(destination.dealId);
    } catch (err) {
      if (ac.signal.aborted || !mountedRef.current || generation !== generationRef.current) return;
      if (err instanceof ApiError && err.status === 403) {
        onForbidden();
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setCandidate(null);
        setUnavailableReason(null);
        setDestinationConfirmed(false);
        setError("This matching evidence is stale because the held message changed. Check the evidence again before connecting.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to connect this message.");
      }
    } finally {
      if (mountedRef.current && generation === generationRef.current) {
        connectingRef.current = false;
        setConnecting(false);
      }
    }
  };

  const destinationLabel = candidate
    ? candidate.channel === "MARKET"
      ? `${candidate.dealName} — Market: ${candidate.marketName || candidate.dealMarketId || "Unspecified market"}`
      : `${candidate.dealName} — Broker`
    : "";

  return (
    <div
      data-testid={`panel-match-evidence-${message.id}`}
      style={{
        marginTop: 8,
        padding: 14,
        background: c.bg,
        border: `1px solid ${c.borderColor}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {!candidate && !unavailableReason && !error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>No deal is connected</div>
            <div style={{ fontSize: 11, color: c.textSecondary, marginTop: 2 }}>
              Check server-verified evidence for one destination. There is no manual deal picker.
            </div>
          </div>
          <button
            type="button"
            data-testid={`button-check-match-evidence-${message.id}`}
            onClick={checkEvidence}
            disabled={checking}
            style={{
              background: c.cardBg,
              border: `1px solid ${c.borderColor}`,
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: c.textPrimary,
              cursor: checking ? "default" : "pointer",
              opacity: checking ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <SearchCheck style={{ width: 14, height: 14 }} />
            {checking ? "Checking evidence..." : "Check matching evidence"}
          </button>
        </div>
      )}

      {checking && !candidate && (
        <div data-testid={`status-checking-match-evidence-${message.id}`} style={{ fontSize: 12, color: c.textMuted }}>
          Checking server matching evidence...
        </div>
      )}

      {unavailableReason && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div data-testid={`status-match-evidence-unavailable-${message.id}`} style={{ fontSize: 12, color: c.textSecondary }}>
            <strong style={{ color: c.textPrimary }}>Matching evidence unavailable:</strong> {unavailableReason}
          </div>
          <button
            type="button"
            data-testid={`button-retry-match-evidence-${message.id}`}
            onClick={checkEvidence}
            disabled={checking}
            style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--accent-primary)", fontSize: 12, fontWeight: 600, cursor: checking ? "default" : "pointer" }}
          >
            {checking ? "Checking..." : "Retry evidence check"}
          </button>
        </div>
      )}

      {error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div data-testid={`status-match-evidence-error-${message.id}`} style={{ fontSize: 12, color: "#ef4444" }}>
            {error}
          </div>
          {!candidate && (
            <button
              type="button"
              data-testid={`button-retry-match-evidence-${message.id}`}
              onClick={checkEvidence}
              disabled={checking}
              style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--accent-primary)", fontSize: 12, fontWeight: 600, cursor: checking ? "default" : "pointer" }}
            >
              {checking ? "Checking..." : "Check evidence again"}
            </button>
          )}
        </div>
      )}

      {candidate && (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
            <CheckCircle2 style={{ width: 16, height: 16, color: "var(--accent-primary)", marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Server destination
              </div>
              <div data-testid={`text-match-destination-${message.id}`} style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary, marginTop: 2 }}>
                {destinationLabel}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              Matching evidence
            </div>
            {candidate.evidence.length > 0 ? (
              <ul data-testid={`list-match-evidence-${message.id}`} style={{ margin: 0, paddingLeft: 20, color: c.textSecondary, fontSize: 12, lineHeight: 1.6 }}>
                {candidate.evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
              </ul>
            ) : (
              <div data-testid={`status-match-evidence-unavailable-${message.id}`} style={{ fontSize: 12, color: c.textSecondary }}>
                The server returned this destination without displayable evidence. Do not connect unless the destination can be confirmed.
              </div>
            )}
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: c.textPrimary, cursor: connecting ? "default" : "pointer" }}>
            <input
              type="checkbox"
              data-testid={`checkbox-confirm-match-destination-${message.id}`}
              checked={destinationConfirmed}
              onChange={(event) => setDestinationConfirmed(event.target.checked)}
              disabled={connecting}
              style={{ margin: "2px 0 0", accentColor: "var(--accent-primary)" }}
            />
            I confirm this message should be connected to {destinationLabel}.
          </label>

          <div style={{ fontSize: 11, color: c.textSecondary }}>
            Connecting only assigns this held message to the deal. It does not release it. Sender confirmation and release remain separate.
          </div>

          <button
            type="button"
            data-testid={`button-connect-match-candidate-${message.id}`}
            onClick={connectToCandidate}
            disabled={!destinationConfirmed || connecting}
            style={{
              alignSelf: "flex-start",
              background: destinationConfirmed && !connecting ? "var(--gradient-cta)" : c.hoverBg,
              color: destinationConfirmed && !connecting ? "#fff" : c.textMuted,
              border: "none",
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: destinationConfirmed && !connecting ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Link2 style={{ width: 14, height: 14 }} />
            {connecting ? "Connecting..." : "Connect to this deal"}
          </button>
        </>
      )}
    </div>
  );
}