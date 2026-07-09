import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { OverallStatusPill } from "../components/StatusPill";
import { EmployeeSummary, Location } from "../types";

export function LocationOverview() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Location[]>("/locations").then((locs) => {
      setLocations(locs);
      setActiveLocationId((prev) => prev ?? locs[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!activeLocationId) return;
    api.get<EmployeeSummary[]>(`/employees?locationId=${activeLocationId}`).then(setEmployees);
  }, [activeLocationId]);

  const activeLocation = useMemo(() => locations.find((l) => l.id === activeLocationId), [locations, activeLocationId]);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (locations.length === 0) return <p className="muted">No locations available for your account yet.</p>;

  return (
    <div>
      <div className="location-overview-sticky-header">
        <h1>Locations</h1>
        <div className="location-tiles">
          {locations.map((loc) => (
            <button
              key={loc.id}
              className={`location-tile${loc.id === activeLocationId ? " active" : ""}`}
              onClick={() => setActiveLocationId(loc.id)}
            >
              <span className="location-tile-code">{loc.shortCode}</span>
              <span className="location-tile-name">{loc.hotelName}</span>
              {loc.roomCount != null && <span className="location-tile-rooms">{loc.roomCount} rooms</span>}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: "-0.5rem" }}>
          Besuche{" "}
          <a href="https://www.leonardo-hotels.com" target="_blank" rel="noreferrer">
            leonardo-hotels.com
          </a>{" "}
          für weitere Details.
        </p>

        {activeLocation && (
          <div className="card" style={{ marginBottom: "1rem" }}>
            <strong>{activeLocation.hotelName}</strong> ({activeLocation.shortCode}) &middot; {activeLocation.address},{" "}
            {activeLocation.plzOrt} &middot; {activeLocation.roomCount ?? "?"} rooms
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Employees</h3>
          <button className="btn" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "Cancel" : "+ Add employee"}
          </button>
        </div>
      </div>

      {showAddForm && activeLocationId && (
        <AddEmployeeForm
          locationId={activeLocationId}
          onCreated={(emp) => {
            setShowAddForm(false);
            navigate(`/employees/${emp.id}`);
          }}
        />
      )}

      <div className="employee-table-scroll">
        <table className="card">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Position</th>
              <th>Entry date</th>
              <th>Overall status</th>
              <th>Tasks</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/employees/${emp.id}`)}>
                <td>{emp.employeeNumber ?? "-"}</td>
                <td>{emp.name}</td>
                <td>{emp.position ?? "-"}</td>
                <td>{new Date(emp.startDate).toLocaleDateString()}</td>
                <td>
                  <OverallStatusPill status={emp.overallStatus} />
                </td>
                <td>
                  {emp.taskCounts.done}/{emp.taskCounts.total} done
                  {emp.taskCounts.notRequired > 0 ? `, ${emp.taskCounts.notRequired} n/a` : ""}
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No employees at this location yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddEmployeeForm({ locationId, onCreated }: { locationId: string; onCreated: (emp: { id: string }) => void }) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const employee = await api.post<{ id: string }>("/employees", {
        locationId,
        name,
        position: position || null,
        startDate,
      });
      onCreated(employee);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create employee");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="position">Position</label>
          <input id="position" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="startDate">Entry date</label>
          <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
      </div>
      <p className="muted" style={{ marginTop: "0.5rem" }}>
        The employee number is assigned automatically (next free number for this location).
      </p>
      {error && <div className="error-text" style={{ marginTop: "0.75rem" }}>{error}</div>}
      <button className="btn" type="submit" disabled={submitting} style={{ marginTop: "0.85rem" }}>
        {submitting ? "Creating..." : "Create employee & checklist"}
      </button>
    </form>
  );
}
