import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../api/client";
import { TaskTemplate } from "../../types";

export function SetupTaskTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function reload() {
    api.get<TaskTemplate[]>("/task-templates").then(setTemplates);
  }

  useEffect(reload, []);

  async function remove(id: string) {
    if (!confirm("Deactivate this task template? It will no longer be assigned to new employees.")) return;
    await api.delete(`/task-templates/${id}`);
    reload();
  }

  async function moveTemplate(templateId: string, direction: "up" | "down") {
    await api.patch("/task-templates/reorder", { templateId, direction });
    reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Task templates (global catalog)</h3>
        <button className="btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Add task template"}
        </button>
      </div>
      <p className="muted">
        This catalog applies to every location. Use "not required" on an individual employee's task instead of removing
        a template here.
      </p>
      {showAdd && <TemplateForm onSaved={() => { setShowAdd(false); reload(); }} />}

      {templates.map((t, i) => (
        <div key={t.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{t.title}</strong>{" "}
              <span className="muted">
                (due {t.defaultDueDays ?? "-"} days before entry, remind {t.defaultReminderDays ?? "-"} days before)
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {t.resources.some((r) => r.type === "document") && (
                <span title="Has a document attached" aria-label="Has a document attached">
                  📄
                </span>
              )}
              {t.resources.some((r) => r.type === "link") && (
                <span title="Has a link attached" aria-label="Has a link attached">
                  🔗
                </span>
              )}
              <button
                className="btn secondary"
                disabled={i === 0}
                onClick={() => moveTemplate(t.id, "up")}
                style={{ padding: "0.45rem 0.6rem" }}
              >
                &uarr;
              </button>
              <button
                className="btn secondary"
                disabled={i === templates.length - 1}
                onClick={() => moveTemplate(t.id, "down")}
                style={{ padding: "0.45rem 0.6rem" }}
              >
                &darr;
              </button>
              <button className="btn secondary" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                {expandedId === t.id ? "Collapse" : "Manage"}
              </button>
              <button className="btn danger" onClick={() => remove(t.id)}>
                Deactivate
              </button>
            </div>
          </div>
          {t.descriptionWhatHow && <p style={{ marginTop: "0.5rem" }}>{t.descriptionWhatHow}</p>}
          {expandedId === t.id && <TemplateDetails template={t} onChanged={reload} />}
        </div>
      ))}
    </div>
  );
}

function TemplateForm({ initial, onSaved }: { initial?: TaskTemplate; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.descriptionWhatHow ?? "");
  const [defaultDueDays, setDefaultDueDays] = useState(initial?.defaultDueDays?.toString() ?? "");
  const [defaultReminderDays, setDefaultReminderDays] = useState(initial?.defaultReminderDays?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title,
      descriptionWhatHow: description || null,
      defaultDueDays: defaultDueDays ? Number(defaultDueDays) : null,
      defaultReminderDays: defaultReminderDays ? Number(defaultReminderDays) : null,
    };
    try {
      if (initial) {
        await api.patch(`/task-templates/${initial.id}`, payload);
      } else {
        await api.post("/task-templates", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save task template");
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-field">
          <label>Default due (days before entry)</label>
          <input type="number" value={defaultDueDays} onChange={(e) => setDefaultDueDays(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Default reminder (days before due)</label>
          <input type="number" value={defaultReminderDays} onChange={(e) => setDefaultReminderDays(e.target.value)} />
        </div>
      </div>
      <div className="form-field" style={{ marginTop: "0.85rem" }}>
        <label>Description — what to do / how</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error && <div className="error-text" style={{ marginTop: "0.5rem" }}>{error}</div>}
      <button className="btn" type="submit" style={{ marginTop: "0.85rem" }}>
        Save
      </button>
    </form>
  );
}

function TemplateDetails({ template, onChanged }: { template: TaskTemplate; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkUsername, setLinkUsername] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      await api.post(`/task-templates/${template.id}/resources/document`, formData);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload document");
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function addLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/task-templates/${template.id}/resources/link`, {
        title: linkTitle,
        url: linkUrl,
        username: linkUsername || null,
        password: linkPassword || null,
      });
      setLinkTitle("");
      setLinkUrl("");
      setLinkUsername("");
      setLinkPassword("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add link");
    }
  }

  async function removeResource(resourceId: string) {
    setError(null);
    try {
      await api.delete(`/task-templates/${template.id}/resources/${resourceId}`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove resource");
    }
  }

  return (
    <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
      <button className="btn secondary" onClick={() => setEditing((v) => !v)} style={{ marginBottom: "0.85rem" }}>
        {editing ? "Cancel edit" : "Edit title / description"}
      </button>
      {editing && <TemplateForm initial={template} onSaved={() => { setEditing(false); onChanged(); }} />}

      <h4>Resources</h4>
      {error && <div className="error-text" style={{ marginBottom: "0.5rem" }}>{error}</div>}
      <ul>
        {template.resources.map((r) => (
          <li key={r.id}>
            {r.type === "document" ? (
              <a href={`/uploads/${r.urlOrFilePath}`} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            ) : (
              <a href={r.urlOrFilePath} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            )}{" "}
            <span className="muted">({r.type})</span>{" "}
            {r.hasCredentials && <span className="muted">&middot; credentials stored{r.username ? ` (${r.username})` : ""}</span>}{" "}
            <button className="btn secondary" onClick={() => removeResource(r.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div
        className={`dropzone ${dragOver ? "dragover" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ cursor: "pointer", marginBottom: "0.85rem" }}
      >
        Drag & drop a form/document here, or click to choose a file
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <form onSubmit={addLink} autoComplete="off" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <input placeholder="Link title" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} required />
        <input placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required style={{ minWidth: 220 }} />
        {/* autoComplete values below stop browsers from offering/autofilling the
            operator's own saved login into these per-resource credential fields. */}
        <input
          placeholder="Username for this resource (optional)"
          value={linkUsername}
          onChange={(e) => setLinkUsername(e.target.value)}
          autoComplete="off"
          name="resource-username"
        />
        <input
          placeholder="Password for this resource (optional)"
          type="password"
          value={linkPassword}
          onChange={(e) => setLinkPassword(e.target.value)}
          autoComplete="new-password"
          name="resource-password"
        />
        <button className="btn" type="submit">
          Add link
        </button>
      </form>
      <p className="muted" style={{ marginTop: "0.4rem" }}>
        Username/password are stored encrypted and only ever shown to authenticated users via the task detail page's
        "Show credentials" button (each reveal is logged in the task's activity log).
      </p>
    </div>
  );
}
