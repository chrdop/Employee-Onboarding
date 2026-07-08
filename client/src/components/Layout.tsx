import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MiniCalendar } from "./MiniCalendar";
import { NotificationBell } from "./NotificationBell";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isHr = user?.role === "hr_central" || user?.role === "hr_deputy";
  const isLocationRole = user?.role === "location_manager" || user?.role === "location_deputy";

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <button className="btn danger" style={{ marginBottom: "1rem" }} onClick={() => logout()}>
          Log out
        </button>
        <div className="brand">Onboarding Tracker</div>
        <NavLink to="/" end>
          Locations
        </NavLink>
        <NavLink to="/daily-report">Daily Report</NavLink>
        {isLocationRole && <NavLink to="/my-open-tasks">My Open Tasks</NavLink>}
        <NavLink to="/notifications">Notifications</NavLink>
        {isHr && <NavLink to="/setup">Setup</NavLink>}
        <div style={{ marginTop: "auto", padding: "0.75rem 1.25rem 0" }}>
          <MiniCalendar />
        </div>
        <div className="nav-footer">
          <div>{user?.name}</div>
          <div style={{ opacity: 0.7 }}>{user?.role}</div>
        </div>
      </nav>
      <main className="app-main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <button className="btn secondary" onClick={() => navigate(-1)}>
            &larr; Back
          </button>
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
