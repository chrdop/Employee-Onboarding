import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import { Location, User, UserRole } from "../../types";

const ROLES: UserRole[] = ["hr_central", "hr_deputy", "location_manager", "location_deputy"];

export function SetupUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [lastTempPassword, setLastTempPassword] = useState<{ email: string; password: string } | null>(null);

  function reload() {
    api.get<User[]>("/users").then(setUsers);
    api.get<Location[]>("/locations").then(setLocations);
  }

  useEffect(reload, []);

  function locationName(id: string | null) {
    return locations.find((l) => l.id === id)?.hotelName ?? "-";
  }

  async function resetPassword(id: string, email: string) {
    const result = await api.post<{ tempPassword: string }>(`/users/${id}/reset-password`);
    setLastTempPassword({ email, password: result.tempPassword });
  }

  async function removeUser(id: string) {
    if (!confirm("Delete this user account?")) return;
    await api.delete(`/users/${id}`);
    reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Users</h3>
        <button className="btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Add user"}
        </button>
      </div>
      <p className="muted">
        Deputies get identical rights to the role they stand in for (HR deputy = HR central; location deputy = that
        location's manager).
      </p>

      {lastTempPassword && (
        <div className="card" style={{ background: "#fff4de" }}>
          Temporary password for <strong>{lastTempPassword.email}</strong>: <code>{lastTempPassword.password}</code>{" "}
          (share this securely — it must be changed on first login)
        </div>
      )}

      {showAdd && (
        <UserForm
          locations={locations}
          onSaved={(tempPassword, email) => {
            setShowAdd(false);
            if (tempPassword) setLastTempPassword({ email, password: tempPassword });
            reload();
          }}
        />
      )}

      <table className="card">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Location</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{locationName(u.locationId)}</td>
              <td style={{ display: "flex", gap: "0.4rem" }}>
                <button className="btn secondary" onClick={() => resetPassword(u.id, u.email)}>
                  Reset password
                </button>
                <button className="btn danger" onClick={() => removeUser(u.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserForm({
  locations,
  onSaved,
}: {
  locations: Location[];
  onSaved: (tempPassword: string | undefined, email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("location_manager");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const needsLocation = role === "location_manager" || role === "location_deputy";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await api.post<{ tempPassword: string }>("/users", {
        name,
        email,
        role,
        locationId: needsLocation ? locationId : null,
      });
      onSaved(result.tempPassword, email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create user");
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-field">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {needsLocation && (
          <div className="form-field">
            <label>Location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              <option value="">Select...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.hotelName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {error && <div className="error-text" style={{ marginTop: "0.5rem" }}>{error}</div>}
      <button className="btn" type="submit" style={{ marginTop: "0.85rem" }}>
        Create user
      </button>
    </form>
  );
}
