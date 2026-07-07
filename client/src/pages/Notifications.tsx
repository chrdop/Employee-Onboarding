import { useEffect, useState } from "react";
import { api } from "../api/client";
import { AppNotification } from "../types";

export function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  function reload() {
    api.get<AppNotification[]>("/notifications").then(setNotifications);
  }

  useEffect(reload, []);

  async function markRead(id: string) {
    await api.post(`/notifications/${id}/read`);
    reload();
  }

  async function markAllRead() {
    await api.post("/notifications/read-all");
    reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Notifications</h1>
        <button className="btn secondary" onClick={markAllRead}>
          Mark all as read
        </button>
      </div>
      {notifications.length === 0 && <p className="muted">No notifications yet.</p>}
      {notifications.map((n) => (
        <div key={n.id} className="card" style={{ opacity: n.isRead ? 0.65 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{n.title}</strong>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              {new Date(n.createdAt).toLocaleString()}
            </span>
          </div>
          <p style={{ marginBottom: "0.5rem" }}>{n.message}</p>
          {!n.isRead && (
            <button className="btn secondary" onClick={() => markRead(n.id)}>
              Mark as read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
