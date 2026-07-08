import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface TaskRow {
  taskId: string;
  title: string;
  employeeName: string;
  dueDate: string | null;
  status?: string;
}

interface FeedbackRow {
  taskId: string;
  title: string;
  employeeName: string;
  feedbackStatus: string;
  externalContactName: string | null;
}

interface DailyReportResponse {
  generatedAt: string;
  blockA_tasks: Record<string, { hotelName: string; overdue: TaskRow[]; dueToday: TaskRow[]; upcoming: TaskRow[] }>;
  blockB_feedback: Record<string, { hotelName: string; items: FeedbackRow[] }>;
  forecast7Days: Array<TaskRow & { employeeId: string; hotelName: string; shortCode: string }>;
}

function TaskRowTable({ rows }: { rows: TaskRow[] }) {
  if (rows.length === 0) return <p className="muted">None.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Task</th>
          <th>Employee</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.taskId}>
            <td>
              <Link to={`/tasks/${r.taskId}`}>{r.title}</Link>
            </td>
            <td>{r.employeeName}</td>
            <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DailyReport() {
  const [report, setReport] = useState<DailyReportResponse | null>(null);

  useEffect(() => {
    api.get<DailyReportResponse>("/daily-report").then(setReport);
  }, []);

  if (!report) return <div className="page-loading">Loading...</div>;

  const locationEntries = Object.entries(report.blockA_tasks);
  const feedbackEntries = Object.entries(report.blockB_feedback);

  return (
    <div>
      <h1>Daily Report</h1>
      <p className="muted">Generated at {new Date(report.generatedAt).toLocaleString()}</p>

      <h2>Today's Task</h2>
      {locationEntries.length === 0 && <p className="muted">No open tasks due in the next 7 days.</p>}
      {locationEntries.map(([locId, group]) => (
        <div key={locId} className="card">
          <h3 style={{ marginTop: 0 }}>{group.hotelName}</h3>
          <strong>Overdue</strong>
          <TaskRowTable rows={group.overdue} />
          <strong style={{ marginTop: "0.75rem", display: "block" }}>Due today</strong>
          <TaskRowTable rows={group.dueToday} />
        </div>
      ))}

      <h2>Feedback</h2>
      {feedbackEntries.length === 0 && <p className="muted">No open feedback requests.</p>}
      {feedbackEntries.map(([locId, group]) => (
        <div key={locId} className="card">
          <h3 style={{ marginTop: 0 }}>{group.hotelName}</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {group.items.map((item) => (
              <li key={item.taskId} style={{ marginBottom: "0.3rem" }}>
                <Link to={`/tasks/${item.taskId}`}>{item.title}</Link> — {item.employeeName} (
                {item.feedbackStatus}
                {item.externalContactName ? `, ${item.externalContactName}` : ""})
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>7-day forecast</h2>
      {report.forecast7Days.length === 0 && <p className="muted">Nothing due in the next 7 days.</p>}
      {report.forecast7Days.length > 0 && (
        <table className="card">
          <thead>
            <tr>
              <th>Location</th>
              <th>Employee</th>
              <th>Task</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {report.forecast7Days.map((r) => (
              <tr key={r.taskId}>
                <td>{r.shortCode}</td>
                <td>
                  <Link to={`/employees/${r.employeeId}`}>{r.employeeName}</Link>
                </td>
                <td>
                  <Link to={`/tasks/${r.taskId}`}>{r.title}</Link>
                </td>
                <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
