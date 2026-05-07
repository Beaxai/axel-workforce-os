import { useState, useEffect, useCallback } from "react";
import {
  GlassCard,
  GhostButton,
  Badge,
  SectionHeader,
} from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";
import { api } from "@/lib/api";
import { Rocket, CheckCircle2 } from "lucide-react";

const WC_PHASES = ["Binder Issued", "Policy Documents Sent", "Client Signature", "Policy Active"];
const PEO_PHASES = ["Welcome & Kickoff", "Data Collection", "System Setup", "Payroll Parallel Run", "Go Live"];
const ASO_PHASES = ["Welcome & Kickoff", "Data Collection", "System Setup", "Payroll Parallel Run", "Go Live"];

interface Tracker {
  id: string;
  dealId: string;
  productType: string;
  goLiveDate: string;
  status: string;
  overallProgress: number;
  createdAt: string;
  completedAt?: string;
  deal?: { businessName?: string; stage?: string; id?: string; productType?: string };
}

type TabKey = "WC" | "PEO" | "ASO";

const isPeoTracker = (t: Tracker) =>
  t.productType === "PEO" || t.productType === "PEO_ONBOARD" || t.deal?.productType === "PEO";
const isAsoTracker = (t: Tracker) =>
  t.productType === "ASO" || t.productType === "ASO_ONBOARD" || t.deal?.productType === "ASO";
const isWcTracker = (t: Tracker) =>
  !isPeoTracker(t) && !isAsoTracker(t);

const getPhases = (t: Tracker) => {
  if (isAsoTracker(t)) return ASO_PHASES;
  if (isPeoTracker(t)) return PEO_PHASES;
  return WC_PHASES;
};

const getExpectedDays = (t: Tracker) => {
  if (isAsoTracker(t)) return 18;
  if (isPeoTracker(t)) return 22;
  return 7;
};

const TAB_LABELS: Record<TabKey, string> = {
  WC: "WC Bind Journey",
  PEO: "PEO Onboarding",
  ASO: "ASO Onboarding",
};

export default function Implementations() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [tab, setTab] = useState<TabKey>("WC");

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  const fetchTrackers = useCallback(async () => {
    const rows = await api.get<Tracker[]>("/implementation");
    const enriched = await Promise.all(
      rows.map(async (t) => {
        try {
          const deal = await api.get<{ businessName?: string; stage?: string; id?: string; productType?: string }>(`/deals/${t.dealId}`);
          return { ...t, deal };
        } catch {
          return { ...t, deal: undefined };
        }
      })
    );
    setTrackers(enriched);
  }, []);

  useEffect(() => {
    fetchTrackers();
  }, [fetchTrackers]);

  const filtered = trackers.filter((t) => {
    if (tab === "WC") return isWcTracker(t);
    if (tab === "PEO") return isPeoTracker(t);
    return isAsoTracker(t);
  });

  const handleAdvancePhase = async (tracker: Tracker) => {
    const phases = getPhases(tracker);
    const totalPhases = phases.length;
    const currentPhase = tracker.overallProgress || 1;

    if (currentPhase >= totalPhases) return;

    const nextPhase = currentPhase + 1;
    const isComplete = nextPhase >= totalPhases;

    const patchData: Record<string, unknown> = {
      overallProgress: nextPhase,
    };
    if (isComplete) {
      patchData.status = "COMPLETE";
      patchData.completedAt = new Date().toISOString();
    }

    await api.patch(`/implementation/${tracker.id}`, patchData);

    api.post(`/deals/${tracker.dealId}/activity`, {
      entityType: "implementation",
      entityId: tracker.id,
      eventType: "PHASE_ADVANCED",
      description: `Implementation phase advanced to: ${phases[nextPhase - 1]}${isComplete ? " — Implementation complete!" : ""}`,
    }).catch(() => {});

    if (isComplete) {
      api.patch(`/deals/${tracker.dealId}`, { stage: "CLIENT" }).catch(() => {});
      api.post(`/deals/${tracker.dealId}/activity`, {
        entityType: "deal",
        entityId: tracker.dealId,
        eventType: "STAGE_CHANGE",
        description: "Deal moved to Client — implementation completed",
      }).catch(() => {});
    }

    fetchTrackers();
  };

  const getDaysElapsed = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div>
      <SectionHeader title="Implementations" subtitle={`${trackers.length} active trackers`} />

      <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
        {(["WC", "PEO", "ASO"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              border: `1px solid ${tab === t ? "#E91E8C" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              background: tab === t ? "rgba(233,30,140,0.12)" : "transparent",
              color: tab === t ? "#E91E8C" : textMuted,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filtered.length === 0 && (
          <GlassCard padding="40px" style={{ textAlign: "center" }}>
            <Rocket style={{ width: "32px", height: "32px", color: textMuted, marginBottom: "12px" }} />
            <p style={{ color: textMuted, fontSize: "15px", margin: 0 }}>
              No {TAB_LABELS[tab]} trackers yet. Move a deal to "Bound" stage to create one.
            </p>
          </GlassCard>
        )}

        {filtered.map((tracker) => {
          const phases = getPhases(tracker);
          const totalPhases = phases.length;
          const currentPhase = tracker.overallProgress || 1;
          const isComplete = tracker.status === "COMPLETE";
          const daysElapsed = getDaysElapsed(tracker.goLiveDate || tracker.createdAt);
          const expectedDays = getExpectedDays(tracker);
          const trackerLabel = isAsoTracker(tracker) ? "ASO Onboarding" : isPeoTracker(tracker) ? "PEO Onboarding" : "WC Bind Journey";

          return (
            <GlassCard key={tracker.id} padding="24px">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>
                      {tracker.deal?.businessName || "Unknown Business"}
                    </h3>
                    <Badge
                      label={trackerLabel}
                      color={isAsoTracker(tracker) ? "#7C3AED" : isPeoTracker(tracker) ? "#E91E8C" : "#1E6BE9"}
                    />
                  </div>
                  <span style={{ fontSize: "13px", color: textMuted }}>
                    Bound: {new Date(tracker.goLiveDate || tracker.createdAt).toLocaleDateString()} • {daysElapsed} days elapsed
                    {!isComplete && <span style={{ color: daysElapsed > expectedDays ? "#ef4444" : textMuted }}> (target: {expectedDays} days)</span>}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Badge
                    label={isComplete ? "Complete" : "In Progress"}
                    color={isComplete ? "#22c55e" : "#E91E8C"}
                  />
                  {!isComplete && currentPhase < totalPhases && (
                    <GhostButton onClick={() => handleAdvancePhase(tracker)} style={{ padding: "6px 14px", fontSize: "12px" }}>
                      Advance Phase
                    </GhostButton>
                  )}
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div style={{ marginBottom: "12px" }}>
                <div style={{
                  width: "100%",
                  height: "8px",
                  borderRadius: "4px",
                  background: inputBg,
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${(currentPhase / totalPhases) * 100}%`,
                    height: "100%",
                    borderRadius: "4px",
                    background: "#E91E8C",
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>

              {/* PHASE LABELS */}
              <div style={{ display: "flex", gap: "4px" }}>
                {phases.map((phase, i) => {
                  const phaseNum = i + 1;
                  const isCurrent = phaseNum === currentPhase;
                  const isDone = phaseNum < currentPhase || isComplete;
                  return (
                    <div
                      key={phase}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "6px",
                        background: isDone ? "rgba(233,30,140,0.08)" : isCurrent ? "rgba(233,30,140,0.04)" : "transparent",
                        border: `1px solid ${isCurrent ? "rgba(233,30,140,0.3)" : isDone ? "rgba(233,30,140,0.1)" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "10px", fontWeight: 600, color: isDone ? "#E91E8C" : textMuted, marginBottom: "2px" }}>
                        {isDone ? <CheckCircle2 style={{ width: "12px", height: "12px", display: "inline" }} /> : `Phase ${phaseNum}`}
                      </div>
                      <div style={{ fontSize: "11px", color: isCurrent ? textPrimary : textMuted }}>{phase}</div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
