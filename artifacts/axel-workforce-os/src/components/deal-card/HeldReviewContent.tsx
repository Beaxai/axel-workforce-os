import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import type { CorrespondenceMessage } from "./types";
import { HeldMessageItem } from "./HeldMessageItem";

interface HeldReviewContentProps {
  dealId: string;
  enabled: boolean;
  collapsible?: boolean;
}

/** Deal-scoped review, shared by the Overview panel and the legacy dialog. */
export default function HeldReviewContent({ dealId, enabled, collapsible = false }: HeldReviewContentProps) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(!collapsible);
  const [messages, setMessages] = useState<CorrespondenceMessage[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const offsetRef = useRef(0);
  const aliveRef = useRef(false);
  const LIMIT = 50;

  const fetchMessages = useCallback(async (loadMore = false) => {
    abortRef.current?.abort();
    if (!enabled) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    if (!loadMore) offsetRef.current = 0;
    const offset = offsetRef.current;
    try {
      const res = await api.get<{ messages: CorrespondenceMessage[]; total: number }>(
        `/deal-card/${dealId}/correspondence/held?filter=all&limit=${expanded ? LIMIT : 1}&offset=${offset}`,
        { signal: ac.signal },
      );
      if (ac.signal.aborted || !aliveRef.current) return;
      const incoming = res.messages || [];
      setMessages(prev => loadMore
        ? [...prev.filter(m => !incoming.some(n => n.id === m.id)), ...incoming]
        : expanded ? incoming : []);
      setTotal(res.total);
      offsetRef.current = offset + incoming.length;
    } catch (err: any) {
      if (ac.signal.aborted || !aliveRef.current) return;
      setError(err?.status === 403
        ? "You do not have permission to view held correspondence."
        : "Failed to load held correspondence.");
      setMessages([]);
      setTotal(null);
    } finally {
      if (!ac.signal.aborted && aliveRef.current) setLoading(false);
    }
  }, [dealId, enabled, expanded]);

  useEffect(() => {
    aliveRef.current = true;
    if (!enabled) {
      abortRef.current?.abort();
      setMessages([]);
      setTotal(null);
      setError(null);
      return () => { aliveRef.current = false; };
    }
    void fetchMessages();
    const onFocus = () => { void fetchMessages(); };
    const onReleased = (e: Event | MessageEvent) => {
      const detail = e instanceof MessageEvent ? e.data : (e as CustomEvent).detail;
      if (!detail?.dealId || detail.dealId === dealId) void fetchMessages();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("held_message_released", onReleased);
    const channel = new BroadcastChannel("held_message_released");
    channel.onmessage = onReleased;
    // Bounded refresh for inbound mail; only one page (or a count) per minute.
    const timer = window.setInterval(() => { void fetchMessages(); }, 60_000);
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("held_message_released", onReleased);
      channel.close();
    };
  }, [dealId, enabled, fetchMessages]);

  const handleRetryBody = async (messageId: string) => {
    if (!enabled || busyId) return;
    setBusyId(messageId);
    try {
      await api.post(`/deal-card/correspondence/inbound/${messageId}/retry-body`, {});
      if (aliveRef.current) void fetchMessages();
    } catch (err: any) {
      if (aliveRef.current) setError(err?.message || "Failed to retry message retrieval.");
    } finally {
      if (aliveRef.current) setBusyId(null);
    }
  };

  const handleRelease = async (messageId: string, channelName: string) => {
    if (!enabled || busyId || !messages.some(m =>
      m.id === messageId && m.isReleasable && m.candidate?.channel === channelName)) return;
    setBusyId(messageId);
    try {
      await api.post(`/deal-card/correspondence/held/${messageId}/release`, {
        channel: channelName,
        senderConfirmed: true,
      });
      if (aliveRef.current) void fetchMessages();
      window.dispatchEvent(new CustomEvent("held_message_released", { detail: { dealId } }));
      const bc = new BroadcastChannel("held_message_released");
      bc.postMessage({ dealId });
      bc.close();
    } catch (err: any) {
      if (aliveRef.current) setError(err?.message || "Failed to release message.");
    } finally {
      if (aliveRef.current) setBusyId(null);
    }
  };

  if (!enabled) return null;
  return (
    <section aria-label="Email approval review" style={{ background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 8, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => collapsible && setExpanded(v => !v)}
        aria-expanded={expanded}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, textAlign: "left", padding: "12px 16px", border: "none", background: c.cardBg, color: c.textPrimary, cursor: collapsible ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}
      >
        <AlertCircle style={{ width: 16, height: 16, color: "var(--accent-support)" }} />
        <span style={{ flex: 1 }}>Email approval review — this deal</span>
        <span style={{ color: c.textSecondary, fontWeight: 500 }}>
          {error ? "Unavailable" : total === null ? "Loading…" : `${total} pending`}
        </span>
        {collapsible && <ChevronDown style={{ width: 16, height: 16, transform: expanded ? "rotate(180deg)" : undefined }} />}
      </button>
      {(expanded || error) && (
        <div style={{ padding: 16, borderTop: `1px solid ${c.borderColor}`, display: "flex", flexDirection: "column", gap: 12 }}>
          {expanded && <div style={{ fontSize: 12, color: c.textSecondary }}>Review held inbound email for this deal. Verify the sender before releasing a message to its matched thread.</div>}
          {error && <div role="alert" style={{ fontSize: 12, color: c.textSecondary, display: "flex", gap: 8, alignItems: "center" }}><Lock style={{ width: 16, height: 16 }} />{error} <button type="button" onClick={() => void fetchMessages()} style={{ color: "var(--accent-primary)", background: "none", border: 0, cursor: "pointer" }}>Retry</button></div>}
          {expanded && !error && (loading && messages.length === 0
            ? <div style={{ fontSize: 12, color: c.textMuted }}>Loading messages...</div>
            : messages.length === 0
              ? <div style={{ fontSize: 12, color: c.textMuted }}>No held messages for this deal.</div>
              : messages.map(msg => <HeldMessageItem key={msg.id} message={msg} onRetry={handleRetryBody} onRelease={handleRelease} busy={busyId !== null} c={c} />))}
          {expanded && !error && messages.length > 0 && messages.length < (total || 0) && (
            <button type="button" onClick={() => void fetchMessages(true)} disabled={loading} style={{ alignSelf: "center", background: c.cardBg, color: c.textPrimary, border: `1px solid ${c.borderColor}`, borderRadius: 6, padding: "6px 14px", cursor: loading ? "default" : "pointer" }}>
              {loading ? "Loading more..." : "Load More"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}