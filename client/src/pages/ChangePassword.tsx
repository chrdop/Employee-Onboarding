import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function ChangePassword() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form className="card" style={{ width: 360 }} onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>Set a new password</h2>
        <p className="muted">This account was created with a temporary password. Please set your own before continuing.</p>
        <div className="form-field" style={{ marginBottom: "0.85rem" }}>
          <label htmlFor="current">Temporary / current password</label>
          <input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div className="form-field" style={{ marginBottom: "0.85rem" }}>
          <label htmlFor="new">New password (min. 8 characters)</label>
          <input id="new" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </div>
        {error && <div className="error-text" style={{ marginBottom: "0.85rem" }}>{error}</div>}
        <button className="btn" type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Saving..." : "Save and continue"}
        </button>
      </form>
    </div>
  );
}
