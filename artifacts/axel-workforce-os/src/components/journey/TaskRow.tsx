import type { JourneyTask } from "@workspace/api-client-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import AxelBadge from "@/components/ui/AxelBadge";

const OWNER_BADGE_COLOR: Record<string, string> = {
  INTERNAL_SPECIALIST: "purple",
  CLIENT: "blue",
  AGENT: "green",
  CARRIER: "yellow",
};

const ERROR_RED = "#ef4444";

function isOverdue(task: JourneyTask): boolean {
  if (task.status === "COMPLETE" || !task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.dueDate}T00:00:00`) < today;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface TaskRowProps {
  task: JourneyTask;
  canComplete: boolean;
  onComplete: (taskId: string) => void;
}

export default function TaskRow({ task, canComplete, onComplete }: TaskRowProps) {
  const c = useThemeColors();
  const complete = task.status === "COMPLETE";
  const overdue = isOverdue(task);
  const enabled = canComplete && !complete;

  return (
    <div
      data-testid={`row-journey-task-${task.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "8px",
        background: c.cardBg,
        border: `1px solid ${overdue ? `${ERROR_RED}73` : c.borderColor}`,
      }}
    >
      <button
        type="button"
        data-testid={`button-complete-task-${task.id}`}
        aria-label={complete ? `${task.taskName} complete` : `Mark ${task.taskName} complete`}
        disabled={!enabled}
        onClick={() => enabled && onComplete(task.id)}
        style={{
          width: "20px",
          height: "20px",
          flexShrink: 0,
          borderRadius: "6px",
          border: complete
            ? "1px solid var(--accent-primary)"
            : `1px solid ${enabled ? "var(--accent-primary)" : c.inputBorder}`,
          background: complete ? "var(--accent-primary)" : "transparent",
          color: "#fff",
          cursor: enabled ? "pointer" : "not-allowed",
          opacity: enabled || complete ? 1 : 0.45,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          lineHeight: 1,
          padding: 0,
        }}
      >
        {complete ? "✓" : ""}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: complete ? c.textMuted : c.textPrimary,
              textDecoration: complete ? "line-through" : "none",
            }}
          >
            {task.taskName}
          </span>
          {task.isMilestone && (
            <span
              data-testid={`marker-milestone-${task.id}`}
              title="Milestone"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "var(--accent-support)",
                background: c.accentSupportSoft,
                borderRadius: "9999px",
                padding: "2px 8px",
                whiteSpace: "nowrap",
              }}
            >
              ◆ MILESTONE
            </span>
          )}
        </div>
      </div>

      <AxelBadge
        label={task.ownerType.replace(/_/g, " ")}
        color={OWNER_BADGE_COLOR[task.ownerType] || "gray"}
      />

      <span
        data-testid={`text-due-date-${task.id}`}
        style={{
          fontSize: "12.5px",
          whiteSpace: "nowrap",
          fontWeight: overdue ? 600 : 400,
          color: overdue ? ERROR_RED : c.textMuted,
        }}
      >
        {overdue ? "Overdue · " : "Due "}
        {formatDate(task.dueDate)}
      </span>
    </div>
  );
}
