/**
 * WC-2 Axel broker fee card — deal card right rail, above/below the deposit
 * card. Default 7% of premium, deal-level editable (ADMIN/CSA), negotiable,
 * invoiced separately. TRACKED NON-BLOCKING: nothing here gates submission
 * or binding. Paid/waived also settles checklist item 10. Tokens only;
 * semantic status colors are the shared literals (#22c55e/#f59e0b).
 */
import { useEffect, useState } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { api } from "@/lib/api";

interface BrokerFeeCardProps {
  dealId: string;
  canAct: boolean; // ADMIN/CSA only
  onChanged: () => void;
}

interface BrokerFeeState {
  percent: number;
  status: string; // UNPAID | PAID | WAIVED
  amount: number | null; // server-computed: percent × WC premium (latest quote)
}

export default function BrokerFeeCard({ dealId, canAct, onChanged }: BrokerFeeCardProps) {
  const c = useThemeColors();
  // The server is the single source of truth for the fee amount — the client
  // never recalculates from premium fields.
  const [fee, setFee] = useState<BrokerFeeState | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("7");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.get<BrokerFeeState>(`/deals/${dealId}/broker-fee`)
      .then((r) => { if (active) { setFee(r); setDraft(String(r.percent)); } })
      .catch(() => { if (active) setFee(null); });
    return () => { active = false; };
  }, [dealId]);

  if (!fee) return null;
  const { percent, status, amount } = fee;

  const dotColor = status === "PAID" ? "#22c55e" : status === "WAIVED" ? c.textMuted : "#f59e0b";
  const statusLabel = status === "PAID" ? "Paid" : status === "WAIVED" ? "Waived" : "Unpaid";

  const patch = async (body: { percent?: number; status?: string }, key: string) => {
    setBusy(key);
    setErr(null);
    try {
      const updated = await api.patch<BrokerFeeState>(`/deals/${dealId}/broker-fee`, body);
      setFee(updated);
      setDraft(String(updated.percent));
      setEditing(false);
      onChanged();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  };

  const btnBase: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    background: "transparent",
    border: `1px solid ${c.borderColor}`,
    color: c.textPrimary,
  };

  return (
    <div style={{ border: `1px solid ${c.borderColor}`, borderRadius: 12, padding: 12, background: c.cardBg }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: c.textMuted, marginBottom: 8 }}>
        Axel Broker Fee
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: c.textPrimary }}>{statusLabel}</span>
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: c.textPrimary }}>
          {percent}%{amount != null ? ` · $${amount.toLocaleString()}` : ""}
        </span>
      </div>
      <div style={{ fontSize: 12, color: c.textMuted, marginBottom: canAct ? 10 : 0 }}>
        Invoiced separately from carrier premium. Never blocks binding.
      </div>

      {canAct && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {editing ? (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                inputMode="decimal"
                aria-label="Broker fee percent"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "6px 8px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  border: `1px solid ${c.borderColor}`,
                  background: "transparent",
                  color: c.textPrimary,
                }}
              />
              <button
                style={{ ...btnBase, width: "auto", padding: "6px 10px" }}
                disabled={busy !== null}
                onClick={() => {
                  const v = Number(draft);
                  if (!Number.isFinite(v) || v < 0 || v > 100) { setErr("Enter a percent between 0 and 100."); return; }
                  void patch({ percent: v }, "percent");
                }}
              >
                {busy === "percent" ? "…" : "Save"}
              </button>
              <button style={{ ...btnBase, width: "auto", padding: "6px 10px", color: c.textMuted }} disabled={busy !== null} onClick={() => { setEditing(false); setDraft(String(percent)); setErr(null); }}>
                Cancel
              </button>
            </div>
          ) : (
            <button style={btnBase} disabled={busy !== null} onClick={() => { setEditing(true); setDraft(String(percent)); }}>
              Edit fee percent
            </button>
          )}
          {status === "UNPAID" && (
            <>
              <button style={btnBase} disabled={busy !== null} onClick={() => void patch({ status: "PAID" }, "paid")}>
                {busy === "paid" ? "Working…" : "Mark fee paid"}
              </button>
              <button style={{ ...btnBase, color: c.textMuted }} disabled={busy !== null} onClick={() => void patch({ status: "WAIVED" }, "waived")}>
                {busy === "waived" ? "Working…" : "Waive fee"}
              </button>
            </>
          )}
          {/* PAID and WAIVED are terminal states with a single deliberate exit:
              reinstate as unpaid. No direct paid↔waived shortcut — a waiver
              can't silently become a payment (each transition is audit-logged). */}
          {(status === "PAID" || status === "WAIVED") && (
            <button style={{ ...btnBase, color: c.textMuted }} disabled={busy !== null} onClick={() => void patch({ status: "UNPAID" }, "unpaid")}>
              {busy === "unpaid" ? "Working…" : "Reinstate as unpaid"}
            </button>
          )}
        </div>
      )}
      {err && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{err}</div>}
    </div>
  );
}
