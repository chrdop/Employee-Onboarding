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

      {templates.map((t) => (
        <div key={t.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{t.title}</strong>{" "}
              <span className="muted">
                (due in {t.defaultDueDays ?? "-"} days, remind {t.defaultReminderDays ?? "-"} days before)
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
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
          <label>Default due (days after start)</label>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);
    await api.post(`/task-templates/${template.id}/resources/document`, formData);
    onChanged();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function addLink(e: FormEvent) {
    e.preventDefault();
    await api.post(`/task-templates/${template.id}/resources/link`, { title: linkTitle, url: linkUrl });
    setLinkTitle("");
    setLinkUrl("");
    onChanged();
  }

  async function removeResource(resourceId: string) {
    await api.delete(`/task-templates/${template.id}/resources/${resourceId}`);
    onChanged();
  }

  return (
    <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
      <button className="btn secondary" onClick={() => setEditing((v) => !v)} style={{ marginBottom: "0.85rem" }}>
        {editing ? "Cancel edit" : "Edit title / description"}
      </button>
      {editing && <TemplateForm initial={template} onSaved={() => { setEditing(false); onChanged(); }} />}

      <h4>Resources</h4>
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

      <form onSubmit={addLink} style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <input placeholder="Link title" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} required />
        <input placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required style={{ minWidth: 220 }} />
        <button className="btn" type="submit">
          Add link
        </button>
      </form>
    </div>
  );
}
