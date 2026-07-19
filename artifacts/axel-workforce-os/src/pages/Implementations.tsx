import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GlassCard,
  Badge,
  SectionHeader,
} from "@/components/ui/axel-index";
import {
  useGetJourneys,
  useGetJourney,
  useUpdateJourneyTaskStatus,
  getGetJourneyQueryKey,
  getGetJourneysQueryKey,
  type Journey,
  type JourneyTask,
} from "@workspace/api-client-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { api } from "@/lib/api";
import JourneyView from "@/components/journey/JourneyView";
import { Rocket, ArrowLeft } from "lucide-react";

type TabKey = "WC" | "PEO" | "ASO";

const TAB_LABELS: Record<TabKey, string> = {
  WC: "WC Bind Journey",
  PEO: "PEO Onboarding",
  ASO: "ASO Onboarding",
};

const tabOf = (j: Journey, dealProductType?: string): TabKey => {
  // Journeys instantiated from an "ANY" template inherit no concrete product
  // type, so fall back to the linked deal's product type before bucketing.
  const product = j.productType === "ANY" ? (dealProductType ?? "WC") : j.productType;
  if (product === "PEO") return "PEO";
  if (product === "ASO") return "ASO";
  return "WC";
};

const EXPECTED_DAYS: Record<TabKey, number> = { WC: 7, PEO: 22, ASO: 18 };

/**
 * Detail view for one journey — the internal specialist's work surface.
 * Renders the shared JourneyView (also used by the client-facing "My Program"),
 * so both audiences can never drift apart.
 */
function JourneyDetailPanel({
  journeyId,
  businessName,
  onBack,
}: {
  journeyId: string;
  businessName: string;
  onBack: () => void;
}) {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const { data: journey, isLoading, error } = useGetJourney(journeyId);
  const updateTask = useUpdateJourneyTaskStatus();
  const [taskError, setTaskError] = useState<string | null>(null);

  const handleCompleteTask = (taskId: string) => {
    setTaskError(null);
    updateTask.mutate(
      { id: journeyId, taskId, data: { status: "COMPLETE" } },
      {
        onSuccess: () => {
          // Progress, phase roll-up and the Active Client flip all happen
          // server-side, so refetch rather than patching local state.
          queryClient.invalidateQueries({ queryKey: getGetJourneyQueryKey(journeyId) });
          queryClient.invalidateQueries({ queryKey: getGetJourneysQueryKey() });
        },
        onError: () => setTaskError("Could not complete that task. Please try again."),
      },
    );
  };

  // INTERNAL audience: staff work everything except the client's own tasks.
  const canCompleteTask = (task: JourneyTask) =>
    task.ownerType !== "CLIENT" && task.status !== "COMPLETE";

  const backButton = (
    <button
      type="button"
      data-testid="button-back-to-journeys"
      onClick={onBack}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "none",
        color: "var(--accent-primary)",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        padding: 0,
        marginBottom: 16,
      }}
    >
      <ArrowLeft style={{ width: 16, height: 16 }} />
      All implementations
    </button>
  );

  if (isLoading) {
    return (
      <div>
        {backButton}
        <GlassCard padding="40px" style={{ textAlign: "center" }}>
          <p style={{ color: c.textMuted, fontSize: 15, margin: 0 }}>Loading journey…</p>
        </GlassCard>
      </div>
    );
  }

  if (error || !journey) {
    return (
      <div>
        {backButton}
        <GlassCard padding="40px" style={{ textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontSize: 15, margin: 0 }}>
            Could not load this journey.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      {backButton}
      <SectionHeader title={businessName} subtitle="Implementation journey" />
      {taskError && (
        <GlassCard padding="12px 16px" style={{ marginBottom: 16, border: "1px solid #ef4444" }}>
          <span data-testid="text-task-error" style={{ color: "#ef4444", fontSize: 13.5 }}>
            {taskError}
          </span>
        </GlassCard>
      )}
      <JourneyView
        journey={journey}
        audience="INTERNAL"
        onCompleteTask={handleCompleteTask}
        canCompleteTask={canCompleteTask}
      />
    </div>
  );
}

export default function Implementations() {
  const c = useThemeColors();
  const [tab, setTab] = useState<TabKey>("WC");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dealInfo, setDealInfo] = useState<Map<string, { businessName: string; productType?: string }>>(new Map());

  const { data: journeys = [], isLoading } = useGetJourneys({ type: "IMPLEMENTATION" });

  useEffect(() => {
    // Deal names/product types come from the legacy deals API (no generated hook exists for it).
    api
      .get<{ id: string; businessName?: string; productType?: string }[]>("/deals")
      .then((deals) =>
        setDealInfo(
          new Map(deals.map((d) => [d.id, { businessName: d.businessName ?? "", productType: d.productType }]))
        )
      )
      .catch(() => setDealInfo(new Map()));
  }, []);

  const bucketOf = (j: Journey): TabKey =>
    tabOf(j, j.dealId ? dealInfo.get(j.dealId)?.productType : undefined);

  const filtered = journeys.filter((j) => bucketOf(j) === tab);

  const getDaysElapsed = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Detail view takes over the page when a journey is selected.
  if (selectedId) {
    const selected = journeys.find((j) => j.id === selectedId);
    const name =
      (selected?.dealId && dealInfo.get(selected.dealId)?.businessName) || "Implementation";
    return (
      <JourneyDetailPanel
        journeyId={selectedId}
        businessName={name}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div>
      <SectionHeader title="Implementations" subtitle={`${journeys.length} active journeys`} />

      <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
        {(["WC", "PEO", "ASO"] as const).map((t) => (
          <button
            key={t}
            data-testid={`tab-${t.toLowerCase()}`}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              border: `1px solid ${tab === t ? "var(--accent-primary)" : c.borderColor}`,
              background: tab === t ? "var(--accent-primary-soft)" : "transparent",
              color: tab === t ? "var(--accent-primary)" : c.textMuted,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {!isLoading && filtered.length === 0 && (
          <GlassCard padding="40px" style={{ textAlign: "center" }}>
            <Rocket style={{ width: "32px", height: "32px", color: c.textMuted, marginBottom: "12px" }} />
            <p data-testid="text-empty-state" style={{ color: c.textMuted, fontSize: "15px", margin: 0 }}>
              No {TAB_LABELS[tab]} journeys yet. Move a deal to "Bound" stage to create one.
            </p>
          </GlassCard>
        )}

        {filtered.map((journey) => {
          const isComplete = journey.status === "COMPLETE";
          const progress = journey.overallProgress ?? 0;
          const anchorDate = journey.goLiveDate || journey.createdAt || "";
          const daysElapsed = anchorDate ? getDaysElapsed(anchorDate) : 0;
          const bucket = bucketOf(journey);
          const expectedDays = EXPECTED_DAYS[bucket];
          const businessName =
            (journey.dealId && dealInfo.get(journey.dealId)?.businessName) || "Unknown Business";

          return (
            <GlassCard
              key={journey.id}
              padding="24px"
              onClick={() => setSelectedId(journey.id)}
              style={{ cursor: "pointer" }}
            >
              <div data-testid={`card-journey-${journey.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: c.textPrimary, margin: 0 }}>
                      {businessName}
                    </h3>
                    <Badge
                      label={TAB_LABELS[bucket]}
                      color={bucket === "WC" ? "blue" : "purple"}
                    />
                  </div>
                  <span style={{ fontSize: "13px", color: c.textMuted }}>
                    Go-live: {anchorDate ? new Date(anchorDate).toLocaleDateString() : "—"} • {daysElapsed} days elapsed
                    {!isComplete && (
                      <span style={{ color: daysElapsed > expectedDays ? "#ef4444" : c.textMuted }}>
                        {" "}(target: {expectedDays} days)
                      </span>
                    )}
                  </span>
                </div>
                <Badge
                  label={isComplete ? "Complete" : "In Progress"}
                  color={isComplete ? "green" : "purple"}
                />
              </div>

              {/* PROGRESS BAR — real task-driven percentage from the journey engine */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    flex: 1,
                    height: "8px",
                    borderRadius: "4px",
                    background: c.inputBg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      borderRadius: "4px",
                      background: "var(--accent-primary)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <span
                  data-testid={`text-progress-${journey.id}`}
                  style={{ fontSize: "13px", fontWeight: 600, color: c.textPrimary, minWidth: "40px", textAlign: "right" }}
                >
                  {progress}%
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
