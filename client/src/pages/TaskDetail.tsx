import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { FeedbackState, Task, TaskResource, TaskStatus } from "../types";
import { StatusPill } from "../components/StatusPill";

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (id) api.get<Task>(`/tasks/${id}`).then(setTask);
  }

  useEffect(reload, [id]);

  if (!task) return <div className="page-loading">Loading...</div>;

  async function updateStatus(status: TaskStatus, notRequiredReason?: string) {
    setError(null);
    try {
      await api.patch(`/tasks/${id}`, { status, notRequiredReason });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status");
    }
  }

  async function updateReminder(days: number | null) {
    await api.patch(`/tasks/${id}`, { reminderIntervalDays: days });
    reload();
  }

  async function updateDueDate(value: string) {
    await api.patch(`/tasks/${id}`, { dueDate: value || null });
    reload();
  }

  return (
    <div>
      <h1>{task.template.title}</h1>
      {task.template.descriptionWhatHow && <p>{task.template.descriptionWhatHow}</p>}

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Status</h3>
        <StatusPill status={task.status} />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
          {(["open", "in_progress", "done"] as TaskStatus[]).map((s) => (
            <button key={s} className="btn secondary" disabled={task.status === s} onClick={() => updateStatus(s)}>
              Mark {s.replace("_", " ")}
            </button>
          ))}
          <NotRequiredButton onConfirm={(reason) => updateStatus("not_required", reason)} />
        </div>
        {task.status === "not_required" && task.notRequiredReason && (
          <p className="muted" style={{ marginTop: "0.6rem" }}>
            Reason: {task.notRequiredReason}
          </p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Reminder</h3>
        <div className="form-field" style={{ maxWidth: 240 }}>
          <label htmlFor="dueDate">Due date</label>
          <input
            id="dueDate"
            type="date"
            defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
            onBlur={(e) => updateDueDate(e.target.value)}
          />
        </div>
        <div className="form-field" style={{ maxWidth: 240, marginTop: "0.75rem" }}>
          <label htmlFor="reminder">Remind this many days before due date</label>
          <input
            id="reminder"
            type="number"
            min={0}
            defaultValue={task.reminderIntervalDays ?? ""}
            onBlur={(e) => updateReminder(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      {task.template.resources.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Resources</h3>
          <ul>
            {task.template.resources.map((r) => (
              <ResourceRow key={r.id} taskId={task.id} resource={r} />
            ))}
          </ul>
        </div>
      )}

      <FeedbackCard task={task} onChanged={reload} />

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Activity log</h3>
        {(task.events ?? []).length === 0 && <p className="muted">No activity yet.</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {(task.events ?? []).map((ev) => (
            <li key={ev.id} style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}>
              <span className="muted">{new Date(ev.timestamp).toLocaleString()}</span> &middot; {ev.text}
              {ev.user ? ` (${ev.user.name})` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ResourceRow({ taskId, resource }: { taskId: string; resource: TaskResource }) {
  const [revealed, setRevealed] = useState<{ username: string | null; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setError(null);
    try {
      const result = await api.post<{ username: string | null; password: string }>(
        `/tasks/${taskId}/resources/${resource.id}/reveal-password`
      );
      setRevealed(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load credentials");
    }
  }

  return (
    <li>
      <a
        href={resource.type === "document" ? `/uploads/${resource.urlOrFilePath}` : resource.urlOrFilePath}
        target="_blank"
        rel="noreferrer"
      >
        {resource.title}
      </a>{" "}
      <span className="muted">({resource.type})</span>
      {resource.hasCredentials && (
        <>
          {" "}
          {!revealed ? (
            <button className="btn secondary" onClick={reveal}>
              Show credentials
            </button>
          ) : (
            <span className="muted">
              &middot; {revealed.username ?? "(no username)"} / <code>{revealed.password}</code>
            </span>
          )}
        </>
      )}
      {error && <div className="error-text">{error}</div>}
    </li>
  );
}

function NotRequiredButton({ onConfirm }: { onConfirm: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <button className="btn secondary" onClick={() => setOpen(true)}>
        Mark not required
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
      <input placeholder="Short reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <button
        className="btn"
        disabled={!reason.trim()}
        onClick={() => {
          onConfirm(reason.trim());
          setOpen(false);
          setReason("");
        }}
      >
        Confirm
      </button>
      <button className="btn secondary" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}

function FeedbackCard({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const [contactName, setContactName] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setFeedbackStatus(status: FeedbackState) {
    await api.patch(`/tasks/${task.id}/feedback`, { status });
    onChanged();
  }

  async function generateLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await api.post<{ magicLinkPath: string }>(`/tasks/${task.id}/feedback/magic-link`, {
        externalContactName: contactName,
      });
      setGeneratedLink(`${window.location.origin}${result.magicLinkPath}`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate link");
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Feedback (external interface)</h3>
      <p className="muted">
        Tracked separately from the task status above — this reflects whether the external partner (IT / KEOS / AMS /
        Payroll) has confirmed their part.
      </p>
      <p>
        Current feedback status: <strong>{task.feedback?.status ?? "not requested yet"}</strong>
        {task.feedback?.externalContactName ? ` (${task.feedback.externalContactName})` : ""}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {(["open", "overdue", "done"] as FeedbackState[]).map((s) => (
          <button key={s} className="btn secondary" onClick={() => setFeedbackStatus(s)}>
            Set {s}
          </button>
        ))}
      </div>

      <form onSubmit={generateLink} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <div className="form-field">
          <label htmlFor="contact">Generate magic link for</label>
          <input id="contact" placeholder="e.g. KEOS support" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        </div>
        <button className="btn" type="submit">
          Generate link
        </button>
      </form>
      {error && <div className="error-text">{error}</div>}
      {generatedLink && (
        <p style={{ marginTop: "0.75rem" }}>
          Share this link (no login required): <br />
          <code>{generatedLink}</code>{" "}
          <button className="btn secondary" onClick={() => navigator.clipboard.writeText(generatedLink)}>
            Copy
          </button>
        </p>
      )}
    </div>
  );
}
