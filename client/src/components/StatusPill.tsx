import { TaskStatus } from "../types";

const LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  not_required: "Not required",
};

export function StatusPill({ status }: { status: TaskStatus }) {
  return (
    <span className={`status-pill ${status}`}>
      <span className={`ampel-dot ${status}`} />
      {LABELS[status]}
    </span>
  );
}

type OverallStatus = "not_started" | "in_progress" | "completed" | "overdue";

// Reuses the same color scale as StatusPill (grey/orange/green/red) via the
// existing .status-pill.<key> classes, just with employee-level labels.
const OVERALL_CLASS: Record<OverallStatus, string> = {
  not_started: "open",
  in_progress: "in_progress",
  completed: "done",
  overdue: "overdue",
};

const OVERALL_LABELS: Record<OverallStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  overdue: "Overdue",
};

export function OverallStatusPill({ status }: { status: OverallStatus }) {
  return <span className={`status-pill ${OVERALL_CLASS[status]}`}>{OVERALL_LABELS[status]}</span>;
}
