import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { useAuthStore } from "@/lib/auth-store";
import { CorrespondenceMessage } from "@/components/deal-card/types";
import { HeldMessageItem } from "@/components/deal-card/HeldMessageItem";
import { HeldMatchEvidence } from "@/components/deal-card/HeldMatchEvidence";
import { AlertTriangle, HelpCircle, LayoutDashboard, Lock, RefreshCw, FolderSearch } from "lucide-react";
import { openDealCard } from "@/components/DealCardModal";

export default function HeldMailPage() {
  const c = useThemeColors();
  const authUserId = useAuthStore((state) => state.user?.id ?? null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<CorrespondenceMessage[]>([]);
  const [counts, setCounts] = useState({ all: 0, matched: 0, unmatched: 0 });
  const [total, setTotal] = useState(0);
  
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");
  const offsetRef = useRef(0);
  const LIMIT = 50;

  const abortRef = useRef<AbortController | null>(null);
  const authUserIdRef = useRef(authUserId);
  authUserIdRef.current = authUserId;

  useLayoutEffect(() => {
    abortRef.current?.abort();
    setAuthorized(authUserId ? null : false);
    setMessages([]);
    setTotal(0);
    setCounts({ all: 0, matched: 0, unmatched: 0 });
    setError(null);
    setLoading(Boolean(authUserId));
    offsetRef.current = 0;

    return () => abortRef.current?.abort();
  }, [authUserId]);

  useEffect(() => {
    if (!authUserId) return;
    const ac = new AbortController();
    const capabilityUserId = authUserId;

    api.get<{canReviewHeld: boolean}>(
      "/deal-card/correspondence/capabilities",
      { signal: ac.signal },
    )
      .then(res => {
        if (!ac.signal.aborted && authUserIdRef.current === capabilityUserId) {
          setAuthorized(res.canReviewHeld);
        }
      })
      .catch(() => {
        if (!ac.signal.aborted && authUserIdRef.current === capabilityUserId) {
          setAuthorized(false);
        }
      });

    return () => ac.abort();
  }, [authUserId]);

  const fetchMessages = useCallback(async (isLoadMore = false) => {
    if (authorized !== true || !authUserId) return;
    
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    const requestUserId = authUserId;
    abortRef.current = ac;

    try {
      setLoading(true);
      setError(null);
      
      if (!isLoadMore) offsetRef.current = 0;
      const currentOffset = offsetRef.current;
      const currentLimit = LIMIT;
      const res = await api.get<{ messages: CorrespondenceMessage[], total: number, counts: any }>(
        `/deal-card/correspondence/held?filter=${filter}&limit=${currentLimit}&offset=${currentOffset}`,
        { signal: ac.signal }
      );
      
      if (ac.signal.aborted || authUserIdRef.current !== requestUserId) return;
      
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
      setCounts(res.counts || { all: 0, matched: 0, unmatched: 0 });
      offsetRef.current = currentOffset + res.messages.length;
      
    } catch (err: any) {
      if (ac.signal.aborted || authUserIdRef.current !== requestUserId) return;
      if (err.status === 403) {
        setAuthorized(false);
      } else {
        setError("Failed to load held correspondence.");
      }
    } finally {
      if (!ac.signal.aborted && authUserIdRef.current === requestUserId) setLoading(false);
    }
  }, [authorized, authUserId, filter]);

  // Reset offset and fetch when filter changes
  useEffect(() => {
    if (authorized === true) {
      offsetRef.current = 0;
      setMessages([]);
      fetchMessages(false);
    } else if (authorized === false) {
      setMessages([]);
      setTotal(0);
      setCounts({ all: 0, matched: 0, unmatched: 0 });
      offsetRef.current = 0;
    }
  }, [filter, authorized, fetchMessages]);

  // Refetch on focus
  useEffect(() => {
    const onFocus = () => {
      if (authorized === true) fetchMessages(false);
    };
    window.addEventListener("focus", onFocus);
    const handleReleased = (e: any) => {
      // Refresh global queue regardless of deal
      if (authorized === true) fetchMessages(false);
    };
    window.addEventListener("held_message_released", handleReleased);
    const bc = new BroadcastChannel("held_message_released");
    bc.onmessage = handleReleased;
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("held_message_released", handleReleased);
      bc.close();
    };
  }, [authorized, fetchMessages]);

  const handleRetryBody = async (messageId: string) => {
    try {
      await api.post(`/deal-card/correspondence/inbound/${messageId}/retry-body`, {});
      fetchMessages(false);
    } catch (err) {
      fetchMessages(false);
    }
  };

  const handleRelease = async (msg: CorrespondenceMessage, channel: string) => {
    try {
      await api.post(`/deal-card/correspondence/held/${msg.id}/release`, {
        channel,
        senderConfirmed: true
      });
      fetchMessages(false);
      window.dispatchEvent(new CustomEvent("held_message_released", { detail: { dealId: msg.dealId } }));
      const bc = new BroadcastChannel("held_message_released");
      bc.postMessage({ dealId: msg.dealId });
      bc.close();
    } catch (err: any) {
      setError(err.message || "Failed to release message.");
    }
  };

  const handleMatchConnected = (dealId: string) => {
    fetchMessages(false);
    window.dispatchEvent(new CustomEvent("held_message_released", { detail: { dealId } }));
    const bc = new BroadcastChannel("held_message_released");
    bc.postMessage({ dealId });
    bc.close();
  };

  if (authorized === null) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 100, color: c.textMuted }}>Checking authorization...</div>;
  }

  if (authorized === false) {
    return (
      <div style={{ padding: "64px 20px", display: "flex", justifyContent: "center" }}>
        <div style={{ background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 12, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 400, textAlign: "center" }}>
          <AlertTriangle style={{ width: 48, height: 48, color: "#ef4444" }} />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: c.textPrimary, marginBottom: 8 }}>Access Denied</h1>
            <p style={{ fontSize: 14, color: c.textSecondary }}>You do not have permission to view the global held correspondence queue.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 64 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: c.textPrimary, display: "flex", alignItems: "center", gap: 10 }}>
            <HelpCircle style={{ width: 24, height: 24, color: "var(--accent-primary)" }} />
            Held Mail
          </h1>
          <p style={{ fontSize: 14, color: c.textSecondary, marginTop: 4 }}>
            Review queue for unauthorized, mixed-audience, or ambiguous inbound mail across all deals.
          </p>
        </div>
        <button
          onClick={() => fetchMessages(false)}
          disabled={loading}
          style={{
            background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 8, padding: "8px 12px",
            fontSize: 13, fontWeight: 600, color: c.textPrimary, cursor: loading ? "default" : "pointer",
            display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.7 : 1
          }}
        >
          <RefreshCw style={{ width: 14, height: 14, animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${c.borderColor}` }}>
        {(["all", "matched", "unmatched"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: "none", border: "none", padding: "12px 16px", cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: filter === f ? "var(--accent-primary)" : c.textMuted,
              borderBottom: filter === f ? `2px solid var(--accent-primary)` : `2px solid transparent`,
              textTransform: "capitalize",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            {f === "all" ? "All Mail" : f === "matched" ? "Matched to a Deal" : "Unmatched"}
            <span style={{ 
              background: filter === f ? "var(--accent-primary)" : c.hoverBg, 
              color: filter === f ? "#fff" : c.textSecondary, 
              padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700, marginLeft: 4 
            }}>
              {counts[f] || 0}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: 16, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, color: "#ef4444", fontSize: 13 }}>
          <Lock style={{ width: 18, height: 18 }} />
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {loading && messages.length === 0 ? (
          <div style={{ fontSize: 14, color: c.textMuted, textAlign: "center", padding: 64 }}>Loading held messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ background: c.cardBg, border: `1px dashed ${c.borderColor}`, borderRadius: 12, padding: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <FolderSearch style={{ width: 48, height: 48, color: c.textMuted }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.textPrimary, marginBottom: 4 }}>Queue Empty</div>
              <div style={{ fontSize: 13, color: c.textSecondary }}>No held messages matching this filter.</div>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={`${filter}-${msg.id}`} style={{ position: "relative" }}>
              <HeldMessageItem message={msg} onRetry={handleRetryBody} onRelease={(id, ch) => handleRelease(msg, ch)} c={c} />
              {!msg.dealId && (
                <HeldMatchEvidence
                  message={msg}
                  c={c}
                  onForbidden={() => setAuthorized(false)}
                  onConnected={handleMatchConnected}
                />
              )}
              {msg.dealId && (
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  <button
                    onClick={() => openDealCard(msg.dealId)}
                    style={{
                      background: c.bg, border: `1px solid ${c.borderColor}`, borderRadius: 6,
                      padding: "6px 12px", fontSize: 12, fontWeight: 600, color: c.textPrimary,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                  >
                    <LayoutDashboard style={{ width: 14, height: 14, color: "var(--accent-primary)" }} />
                    Open Deal
                  </button>
                </div>
              )}
            </div>
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
    </div>
  );
}
