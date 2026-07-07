import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./lib/env";
import { scheduleReminderJob } from "./jobs/reminderJob";

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import locationsRoutes from "./routes/locations";
import taskTemplatesRoutes from "./routes/taskTemplates";
import employeesRoutes from "./routes/employees";
import tasksRoutes from "./routes/tasks";
import notificationsRoutes from "./routes/notifications";
import dailyReportRoutes from "./routes/dailyReport";
import settingsRoutes from "./routes/settings";
import publicRoutes from "./routes/public";

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(env.uploadDir)));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/task-templates", taskTemplatesRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/daily-report", dailyReportRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/public", publicRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

scheduleReminderJob();

app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
});
