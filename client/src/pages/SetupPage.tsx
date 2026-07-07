import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { SetupLocations } from "./setup/SetupLocations";
import { SetupTaskTemplates } from "./setup/SetupTaskTemplates";
import { SetupUsers } from "./setup/SetupUsers";
import { SetupSettings } from "./setup/SetupSettings";

export function SetupPage() {
  return (
    <div>
      <h1>Setup</h1>
      <div className="tabs">
        <SetupTab to="/setup/locations" label="Locations" />
        <SetupTab to="/setup/task-templates" label="Task templates" />
        <SetupTab to="/setup/users" label="Users" />
        <SetupTab to="/setup/settings" label="Settings" />
      </div>
      <Routes>
        <Route index element={<Navigate to="locations" replace />} />
        <Route path="locations" element={<SetupLocations />} />
        <Route path="task-templates" element={<SetupTaskTemplates />} />
        <Route path="users" element={<SetupUsers />} />
        <Route path="settings" element={<SetupSettings />} />
      </Routes>
    </div>
  );
}

function SetupTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => (isActive ? "active" : "")}>
      {label}
    </NavLink>
  );
}
