import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

export function Layout() {
  const { user, logout } = useAuth();
  const isHr = user?.role === "hr_central" || user?.role === "hr_deputy";
  const isLocationRole = user?.role === "location_manager" || user?.role === "location_deputy";

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">Onboarding Tracker</div>
        <NavLink to="/" end>
          Locations
        </NavLink>
        <NavLink to="/daily-report">Daily Report</NavLink>
        {isLocationRole && <NavLink to="/my-open-tasks">My Open Tasks</NavLink>}
        <NavLink to="/notifications">Notifications</NavLink>
        {isHr && <NavLink to="/setup">Setup</NavLink>}
        <div className="nav-footer">
          <div>{user?.name}</div>
          <div style={{ opacity: 0.7 }}>{user?.role}</div>
          <button
            className="btn secondary"
            style={{ marginTop: "0.5rem", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
            onClick={() => logout()}
          >
            Log out
          </button>
        </div>
      </nav>
      <main className="app-main">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
