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
