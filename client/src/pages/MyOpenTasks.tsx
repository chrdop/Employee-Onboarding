import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface TaskRow {
  taskId: string;
  title: string;
  employeeName: string;
  dueDate: string | null;
}

interface DailyReportResponse {
  blockA_tasks: Record<string, { hotelName: string; overdue: TaskRow[]; dueToday: TaskRow[]; upcoming: TaskRow[] }>;
}

function Section({ title, rows }: { title: string; rows: TaskRow[] }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {title} ({rows.length})
      </h3>
      {rows.length === 0 && <p className="muted">Nothing here.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {rows.map((r) => (
          <li key={r.taskId} style={{ marginBottom: "0.3rem" }}>
            <Link to={`/tasks/${r.taskId}`}>{r.title}</Link> — {r.employeeName}
            {r.dueDate ? ` (due ${new Date(r.dueDate).toLocaleDateString()})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Condensed view for location managers/deputies: same underlying data as the
// daily report, but flattened for a single location instead of grouped by hotel.
export function MyOpenTasks() {
  const [report, setReport] = useState<DailyReportResponse | null>(null);

  useEffect(() => {
    api.get<DailyReportResponse>("/daily-report").then(setReport);
  }, []);

  if (!report) return <div className="page-loading">Loading...</div>;

  const groups = Object.values(report.blockA_tasks);
  const overdue = groups.flatMap((g) => g.overdue);
  const dueToday = groups.flatMap((g) => g.dueToday);
  const upcoming = groups.flatMap((g) => g.upcoming);

  return (
    <div>
      <h1>My Open Tasks</h1>
      <Section title="Overdue" rows={overdue} />
      <Section title="Due today" rows={dueToday} />
      <Section title="Upcoming (next 7 days)" rows={upcoming} />
    </div>
  );
}
