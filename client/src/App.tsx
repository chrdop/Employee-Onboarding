import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { ChangePassword } from "./pages/ChangePassword";
import { LocationOverview } from "./pages/LocationOverview";
import { EmployeeDetail } from "./pages/EmployeeDetail";
import { TaskDetail } from "./pages/TaskDetail";
import { DailyReport } from "./pages/DailyReport";
import { MyOpenTasks } from "./pages/MyOpenTasks";
import { Notifications } from "./pages/Notifications";
import { SetupPage } from "./pages/SetupPage";
import { PublicFeedback } from "./pages/PublicFeedback";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/feedback/:token" element={<PublicFeedback />} />

      <Route path="/change-password" element={<ChangePassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<LocationOverview />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/daily-report" element={<DailyReport />} />
          <Route path="/my-open-tasks" element={<MyOpenTasks />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["hr_central", "hr_deputy"]} />}>
        <Route element={<Layout />}>
          <Route path="/setup/*" element={<SetupPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
