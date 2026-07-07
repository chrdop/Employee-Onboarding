import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { EmployeeDetail as EmployeeDetailType } from "../types";
import { StatusPill } from "../components/StatusPill";

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<EmployeeDetailType | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) api.get<EmployeeDetailType>(`/employees/${id}`).then(setEmployee);
  }, [id]);

  if (!employee) return <div className="page-loading">Loading...</div>;

  return (
    <div>
      <button className="btn secondary" onClick={() => navigate(-1)} style={{ marginBottom: "1rem" }}>
        &larr; Back
      </button>
      <h1>{employee.name}</h1>
      <p className="muted">
        {employee.position ?? "No position set"} &middot; {employee.location.hotelName} &middot; Start:{" "}
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
