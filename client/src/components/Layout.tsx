import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { MiniCalendar } from "./MiniCalendar";
import { NotificationBell } from "./NotificationBell";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [apiProblem, setApiProblem] = useState<{ status: number; message: string } | null>(null);

  // Any API call a page didn't handle itself (loads, saves, moves, ...) ends up
  // here, so a failure is always visible instead of silently doing nothing.
  useEffect(() => {
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      if (event.reason instanceof ApiError) {
        event.preventDefault();
        setApiProblem({
          status: event.reason.status,
          message:
            event.reason.status === 401
              ? "Your session has expired. Please log in again."
              : event.reason.message,
        });
      }
    }
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  useEffect(() => setApiProblem(null), [pathname]);

  const isHr = user?.role === "hr_central" || user?.role === "hr_deputy";
  const isLocationRole = user?.role === "location_manager" || user?.role === "location_deputy";

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <button className="btn danger" style={{ marginBottom: "1rem" }} onClick={() => logout()}>
          Log out
        </button>
        <div className="brand">
          Onboarding Tracker <span className="app-version">v{__APP_VERSION__}</span>
        </div>
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
        {apiProblem && (
          <div className="error-banner" role="alert">
            <span>{apiProblem.message}</span>
            <span style={{ display: "flex", gap: "0.5rem" }}>
              {apiProblem.status === 401 || apiProblem.status === 0 ? (
                <button className="btn secondary" onClick={() => window.location.reload()}>
                  Reload page
                </button>
              ) : null}
              <button className="btn secondary" onClick={() => setApiProblem(null)}>
                Dismiss
              </button>
            </span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
