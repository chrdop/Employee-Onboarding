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

  // Close the phone menu and clear any error banner when the page changes.
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    setApiProblem(null);
    setNavOpen(false);
  }, [pathname]);

  const isHr = user?.role === "hr_central" || user?.role === "hr_deputy";
  const isLocationRole = user?.role === "location_manager" || user?.role === "location_deputy";

  return (
    <>
      <header className="app-header">
        <div className="app-header-left">
          <button
            type="button"
            className="btn secondary menu-toggle"
            aria-expanded={navOpen}
            aria-controls="app-nav"
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? "Close" : "Menu"}
          </button>
          {/* Text logo until the official logo file is added (never redraw the logo). */}
          <span className="logo-text">LEONARDO HOTELS</span>
          <span className="app-title">
            Onboarding Tracker <span className="app-version">v{__APP_VERSION__}</span>
          </span>
        </div>
        <div className="app-header-right">
          <span>{user?.name}</span>
          <span className="user-role">{user?.role}</span>
        </div>
      </header>
      <div className="app-shell">
        {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
        <nav id="app-nav" className={`app-nav${navOpen ? " open" : ""}`}>
          <button className="btn secondary" onClick={() => logout()}>
            Log out
          </button>
          <NavLink to="/" end>
            Locations
          </NavLink>
          <NavLink to="/daily-report">Daily Report</NavLink>
          {isLocationRole && <NavLink to="/my-open-tasks">My Open Tasks</NavLink>}
          <NavLink to="/notifications">Notifications</NavLink>
          {isHr && <NavLink to="/setup">Setup</NavLink>}
          <MiniCalendar />
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
    </>
  );
}
