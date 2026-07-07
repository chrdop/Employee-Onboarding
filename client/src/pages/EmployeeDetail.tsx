import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { EmployeeDetail as EmployeeDetailType } from "../types";
import { StatusPill } from "../components/StatusPill";

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<EmployeeDetailType | null>(null);
  const navigate = useNavigate();

  function reload() {
    if (id) api.get<EmployeeDetailType>(`/employees/${id}`).then(setEmployee);
  }

  useEffect(reload, [id]);

  async function moveTask(taskId: string, direction: "up" | "down") {
    if (!id) return;
    await api.patch(`/employees/${id}/tasks/reorder`, { taskId, direction });
    reload();
  }

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

      <h3>Onboarding checklist</h3>
      <table className="card">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Due date</th>
            <th>Feedback</th>
            <th>Order</th>
          </tr>
        </thead>
        <tbody>
          {employee.tasks.map((task, i) => (
            <tr key={task.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/tasks/${task.id}`)}>
              <td>{task.template.title}</td>
              <td>
                <StatusPill status={task.status} />
              </td>
              <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</td>
              <td>{task.feedback ? task.feedback.status : "-"}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn secondary"
                  disabled={i === 0}
                  onClick={() => moveTask(task.id, "up")}
                  style={{ padding: "0.15rem 0.5rem", marginRight: "0.25rem" }}
                >
                  &uarr;
                </button>
                <button
                  className="btn secondary"
                  disabled={i === employee.tasks.length - 1}
                  onClick={() => moveTask(task.id, "down")}
                  style={{ padding: "0.15rem 0.5rem" }}
                >
                  &darr;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
