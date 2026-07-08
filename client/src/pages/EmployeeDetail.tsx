import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { EmployeeDetail as EmployeeDetailType } from "../types";
import { StatusPill } from "../components/StatusPill";

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<EmployeeDetailType | null>(null);
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  function reload() {
    if (id) api.get<EmployeeDetailType>(`/employees/${id}`).then(setEmployee);
  }

  useEffect(reload, [id]);

  if (!employee) return <div className="page-loading">Loading...</div>;

  return (
    <div>
      <h1>{employee.name}</h1>
      <p className="muted">
        {employee.position ?? "No position set"} &middot; {employee.location.hotelName} &middot; Entry date:{" "}
        {new Date(employee.startDate).toLocaleDateString()}
        {employee.employeeNumber ? ` · #${employee.employeeNumber}` : ""}
      </p>
      {employee.peopledocReference && (
        <p className="muted">
          PeopleDoc reference: <a href={employee.peopledocReference}>{employee.peopledocReference}</a>
        </p>
      )}
      <button className="btn secondary" onClick={() => setEditing((v) => !v)} style={{ marginBottom: "0.85rem" }}>
        {editing ? "Cancel edit" : "Edit entry date / details"}
      </button>
      {editing && (
        <EditEmployeeForm
          employee={employee}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}

      <h3>Onboarding checklist</h3>
      <table className="card">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Due date</th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {employee.tasks.map((task) => (
            <tr key={task.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/tasks/${task.id}`)}>
              <td>{task.template.title}</td>
              <td>
                <StatusPill status={task.status} />
              </td>
              <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</td>
              <td>{task.feedback ? task.feedback.status : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditEmployeeForm({ employee, onSaved }: { employee: EmployeeDetailType; onSaved: () => void }) {
  const [name, setName] = useState(employee.name);
  const [position, setPosition] = useState(employee.position ?? "");
  const [startDate, setStartDate] = useState(employee.startDate.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.patch(`/employees/${employee.id}`, {
        name,
        position: position || null,
        startDate,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save employee");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="edit-name">Name</label>
          <input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="edit-position">Position</label>
          <input id="edit-position" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="edit-startDate">Entry date</label>
          <input
            id="edit-startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
      </div>
      <p className="muted" style={{ marginTop: "0.5rem" }}>
        Employee number #{employee.employeeNumber ?? "-"} is assigned automatically and can't be changed here.
        Changing the entry date recalculates every task's due date (still N days before entry).
      </p>
      {error && <div className="error-text" style={{ marginTop: "0.5rem" }}>{error}</div>}
      <button className="btn" type="submit" disabled={submitting} style={{ marginTop: "0.85rem" }}>
        {submitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
