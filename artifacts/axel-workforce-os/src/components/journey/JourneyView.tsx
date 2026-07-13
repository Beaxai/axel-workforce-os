import type { JourneyDetail, JourneyTask } from "@workspace/api-client-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import AxelBadge from "@/components/ui/AxelBadge";
import PhaseGroup from "./PhaseGroup";

export type JourneyViewProps = {
  journey: JourneyDetail;
  audience: "INTERNAL" | "CLIENT";
  onCompleteTask: (taskId: string) => void;
  canCompleteTask: (task: JourneyTask) => boolean;
};

const JOURNEY_STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS: "purple",
  COMPLETE: "green",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function JourneyView({
  journey,
  audience,
  onCompleteTask,
  canCompleteTask,
}: JourneyViewProps) {
  const c = useThemeColors();
  const progress = Math.max(0, Math.min(100, journey.overallProgress));

  const phases = [...journey.phases].sort((a, b) => a.phaseNumber - b.phaseNumber);
  const tasksByPhase = new Map<string, JourneyTask[]>();
  for (const task of journey.tasks) {
    const list = tasksByPhase.get(task.phaseId) ?? [];
    list.push(task);
    tasksByPhase.set(task.phaseId, list);
  }
  for (const list of tasksByPhase.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const title =
    journey.type === "IMPLEMENTATION"
      ? audience === "CLIENT"
        ? "Your Implementation Journey"
        : "Implementation Journey"
      : audience === "CLIENT"
        ? "Your Onboarding Journey"
        : "Onboarding Journey";

  return (
    <div data-testid="view-journey">
      {/* HEADER */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: c.textPrimary, margin: 0 }}>
            {title}
          </h2>
          <AxelBadge label={journey.productType} color="purple" />
          <AxelBadge
            label={journey.status.replace(/_/g, " ")}
            color={JOURNEY_STATUS_COLOR[journey.status] || "gray"}
          />
          <span style={{ marginLeft: "auto", fontSize: "12.5px", color: c.textMuted, whiteSpace: "nowrap" }}>
            Go-live {formatDate(journey.goLiveDate)}
          </span>
        </div>

        {/* PROGRESS BAR */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            data-testid="progress-journey"
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
            data-testid="text-journey-progress"
            style={{ fontSize: "13px", fontWeight: 600, color: c.textSecondary, whiteSpace: "nowrap" }}
          >
            {progress}%
          </span>
        </div>
      </div>

      {/* PHASES */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {phases.length === 0 ? (
          <div style={{ fontSize: "13.5px", color: c.textMuted }}>
            No phases on this journey yet.
          </div>
        ) : (
          phases.map((phase) => (
            <PhaseGroup
              key={phase.id}
              phase={phase}
              tasks={tasksByPhase.get(phase.id) ?? []}
              canCompleteTask={canCompleteTask}
              onCompleteTask={onCompleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
