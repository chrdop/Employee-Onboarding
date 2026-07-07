# Onboarding Tracker — Leonardo Hotels Austria

Web app to support employee onboarding across 10+ hotel locations. Built after
`Onboarding-Webapp-Konzept.md.txt`, section 7 ("fertiger Build-Prompt"). See
`server/prisma/schema.prisma` for the full data model and
`C:\Users\chris\.claude\plans\linked-skipping-cook.md` for the build plan and
the scope decisions behind this MVP.

## What's included (MVP)

- Setup (HR central / HR deputy only): locations, location contacts,
  interface contacts (IT/Payroll/KEOS/AMS/...), global task-template catalog
  with drag & drop resource upload, user management, daily-report-time setting
- Global task catalog seeded from the real onboarding task list, applied to
  every new employee automatically; any task can be marked "not required" per
  employee with a logged reason
- Per-location employee list (role-scoped) → employee checklist with a
  4-status "ampel" (open / in progress / done / not required)
- Task detail: status, full audit log, reminder interval, description &
  resources, feedback status (separate from task status), magic-link
  generation for external interfaces (no login needed on their end)
- In-app notification center + daily reminder scan (overdue / reminder-due
  tasks)
- Daily report (Block A tasks / Block B feedback, grouped by location, + 7-day
  forecast) and a condensed "My open tasks" view for location managers
- Roles: `hr_central`, `hr_deputy`, `location_manager`, `location_deputy`
  (deputies have identical rights to the role they stand in for)

## Deliberately not included yet (documented next steps)

- Email / MS Teams delivery (in-app notifications only for now)
- Subtasks, comments/work-sharing, calendar/ICS view, KPI dashboard,
  PeopleDoc API integration
- The future employee-monitoring module (training, Mutterschutz, Karenz,
  offboarding) and termination/notice-period tracking — the data model
  (templates/tasks/events/roles) is kept generic on purpose so this can be
  added later without restructuring the core tables

## Tech stack

- `/server`: Node.js + Express + TypeScript + Prisma + PostgreSQL
- `/client`: React (Vite) + TypeScript
- File storage for task-resource templates: local disk for now, behind a
  small adapter interface (`server/src/services/storage.ts`) so an
  S3-compatible backend can be swapped in later without touching call sites

## Local setup

1. **Get a PostgreSQL instance.** Either:
   - Docker (requires Docker Desktop + WSL2 on Windows): `docker compose up -d`, or
   - A free cloud instance (no local install/admin rights needed) — e.g.
     [neon.tech](https://neon.tech): sign up, create a project, copy the
     connection string it gives you. This is what was used to verify this
     app end-to-end, since Docker/WSL2 wasn't viable on the original dev
     machine (insufficient disk space for WSL2).
2. **Configure environment**: copy `.env.example` to `server/.env` and set
   `DATABASE_URL` to either the docker-compose default or your cloud
   connection string. Adjust `JWT_SECRET` for anything beyond local testing.
3. **Install dependencies** (from the repo root):
   ```
   npm install
   ```
4. **Create the database schema**:
   ```
   cd server
   npx prisma migrate dev --name init
   ```
5. **Seed real master data** (8 locations, real task catalog, one demo
   employee, and an initial HR-central admin account):
   ```
   npm run prisma:seed
   ```
   The generated admin email/password is printed to the console — copy it,
   you'll need it to log in the first time (you'll be forced to set your own
   password immediately after).
6. **Run both apps** (from the repo root):
   ```
   npm run dev
   ```
   Backend on `http://localhost:4000`, frontend on `http://localhost:5173`
   (Vite proxies `/api` to the backend).

## Moving this to Replit

This was built locally because there's no direct Replit connector available
from this environment. To get it into your Replit account:

```
git init
git add .
git commit -m "Initial onboarding tracker MVP"
```

Push to a GitHub repo, then in Replit use **Import from GitHub**. Replit can
provision its own PostgreSQL (or Neon) instance — point `DATABASE_URL` at
that, then repeat steps 4–6 above inside the Replit shell.

## Verification status

Verified end-to-end in a real browser against a live (Neon) Postgres
instance: login + forced password change, all 8 seeded locations, employee
checklist, task status transitions incl. "not required" with a logged
reason, feedback status + magic-link flow (including the public no-login
feedback page), the daily report, Setup CRUD (task templates + resources,
users), and role enforcement on both the frontend (redirects) and backend
(403s on direct API calls). No server or console errors were observed.
Not yet exercised: real email/Teams delivery (out of MVP scope by design),
and a run inside Replit itself.
