/**
 * §6E carrier-deposit monitor card (WC-3b Task 3) — rendered in the deal
 * card's persistent right rail on bound deals. Shows the deposit status and,
 * for ADMIN/CSA, the two resolution actions: mark confirmed / record a
 * cancel-for-nonpay notice (flags the deal AT RISK). Parallel and NON-GATING:
 * nothing here touches stage, trackers, or Active Client conversion.
 * Tokens only; verified light + dark.
 */
import { useState } from "react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { api } from "@/lib/api";

interface DepositCardProps {
  dealId: string;
  depositStatus: string; // MONITORING | CONFIRMED | AT_RISK
  depositDueDate: string | null;
  canAct: boolean; // ADMIN/CSA only
  onChanged: () => void; // refetch the deal payload
}

const STATUS_META: Record<string, { label: string; tone: "ok" | "warn" | "bad" }> = {
  MONITORING: { label: "Monitoring", tone: "warn" },
  CONFIRMED: { label: "Confirmed", tone: "ok" },
  AT_RISK: { label: "At risk", tone: "bad" },
};

export default function DepositCard({ dealId, depositStatus, depositDueDate, canAct, onChanged }: DepositCardProps) {
  const c = useThemeColors();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const meta = STATUS_META[depositStatus] ?? { label: depositStatus, tone: "warn" as const };
  // Semantic status colors (green/yellow/red) are not brand colors — literals
  // per the design-system rule, same values used across the deal card.
  const dotColor = meta.tone === "ok" ? "#22c55e" : meta.tone === "bad" ? "#ef4444" : "#f59e0b";

  const act = async (action: "confirm" | "cancel-notice") => {
    setBusy(action);
    setErr(null);
    try {
      await api.post(`/deals/${dealId}/deposit/${action}`, {});
      onChanged();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Action failed.");
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
        Carrier Deposit
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: c.textPrimary }}>{meta.label}</span>
      </div>
      <div style={{ fontSize: 12, color: c.textMuted, marginBottom: canAct && depositStatus !== "CONFIRMED" ? 10 : 0 }}>
        {depositStatus === "CONFIRMED"
          ? "Deposit received by the carrier."
          : depositStatus === "AT_RISK"
            ? "Cancel-for-nonpay notice on file. Never blocks onboarding."
            : `Client pays the carrier directly${depositDueDate ? ` — due by ${depositDueDate}` : ""}.`}
      </div>
      {canAct && depositStatus !== "CONFIRMED" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            style={btnBase}
            disabled={busy !== null}
            onClick={() => void act("confirm")}
          >
            {busy === "confirm" ? "Working\u2026" : "Mark deposit confirmed"}
          </button>
          {depositStatus === "MONITORING" && (
            <button
              style={{ ...btnBase, color: "#ef4444", borderColor: "rgba(239,68,68,0.5)" }}
              disabled={busy !== null}
              onClick={() => void act("cancel-notice")}
            >
              {busy === "cancel-notice" ? "Working\u2026" : "Record cancellation notice"}
            </button>
          )}
        </div>
      )}
      {err && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{err}</div>}
    </div>
  );
}
