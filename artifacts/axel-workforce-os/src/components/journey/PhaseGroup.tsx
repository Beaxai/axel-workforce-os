import type { JourneyPhase, JourneyTask } from "@workspace/api-client-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import AxelBadge from "@/components/ui/AxelBadge";
import TaskRow from "./TaskRow";

const PHASE_STATUS_COLOR: Record<string, string> = {
  PENDING: "gray",
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

interface PhaseGroupProps {
  phase: JourneyPhase;
  tasks: JourneyTask[];
  canCompleteTask: (task: JourneyTask) => boolean;
  onCompleteTask: (taskId: string) => void;
}

export default function PhaseGroup({ phase, tasks, canCompleteTask, onCompleteTask }: PhaseGroupProps) {
  const c = useThemeColors();

  return (
    <div data-testid={`group-journey-phase-${phase.id}`}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            width: "26px",
            height: "26px",
            flexShrink: 0,
            borderRadius: "9999px",
            background: c.accentPrimarySoft,
            color: "var(--accent-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12.5px",
            fontWeight: 700,
          }}
        >
          {phase.phaseNumber}
        </span>
        <span
          className="font-heading"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: c.sectionHeading,
          }}
        >
          {phase.phaseName}
        </span>
        <AxelBadge
          label={phase.status.replace(/_/g, " ")}
          color={PHASE_STATUS_COLOR[phase.status] || "gray"}
        />
        <span style={{ marginLeft: "auto", fontSize: "12.5px", color: c.textMuted, whiteSpace: "nowrap" }}>
          Target {formatDate(phase.targetDate)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {tasks.length === 0 ? (
          <div style={{ fontSize: "13px", color: c.textMuted, padding: "6px 12px" }}>
            No tasks in this phase.
          </div>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              canComplete={canCompleteTask(task)}
              onComplete={onCompleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
