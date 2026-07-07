import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AppNotification } from "../types";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api
      .get<AppNotification[]>("/notifications")
      .then(setNotifications)
      .catch(() => undefined);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ position: "relative" }}>
      <button className="btn secondary" onClick={() => setOpen((o) => !o)}>
        Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
      </button>
      {open && (
        <div
          className="card"
          style={{ position: "absolute", right: 0, top: "2.4rem", width: 320, zIndex: 10, maxHeight: 360, overflowY: "auto" }}
        >
          {notifications.length === 0 && <div className="muted">No notifications yet.</div>}
          {notifications.slice(0, 10).map((n) => (
            <div key={n.id} style={{ marginBottom: "0.6rem", fontWeight: n.isRead ? 400 : 700 }}>
              <div style={{ fontSize: "0.85rem" }}>{n.title}</div>
              <div className="muted" style={{ fontSize: "0.78rem" }}>
                {n.message}
              </div>
            </div>
          ))}
          <Link to="/notifications" onClick={() => setOpen(false)}>
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
