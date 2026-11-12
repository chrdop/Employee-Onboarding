# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Employee onboarding tracker for Leonardo Hotels Austria (8 real hotel
locations). Tracks a global catalog of onboarding tasks (job offer, contract,
social insurance registration, KEOS/AMS system setup, etc.) per new employee,
with role-scoped access, a daily report, in-app reminders, and a no-login
magic-link flow for external interfaces (IT/Payroll/KEOS/AMS) to confirm
their part without an account.

## Project status

As of 2026-07-09, the project owner considers **Ausbaustufe 1 (MVP)
feature-complete** — no more ad-hoc items pending. The result is now being
tested "praxisnah" (hands-on) with the actual HR-responsible person in the
Replit dev environment before any further work starts. **Don't proactively
propose or start Ausbaustufe 2 features** (see README's "Deliberately not
included yet") until the user explicitly says the HR test round is done and
gives the go-ahead. Until then, expect only bug-fix/polish requests, most
likely delivered as another `Bugs/*.odt` batch (see below).

## Language and error handling

The whole app is **consistently English**: UI texts, error messages, server
logs/warnings, scripts. Decided by the project owner (2026-11-12); this
deliberately overrides the "error messages in German" rule of the
hotel-app-standards skill. Not translated, on purpose: real master data
(hotel names, addresses, task titles like "Angebot"). Calendar month names are
fixed to `en-GB`.

Errors must never fail silently. `client/src/api/client.ts` turns failures into
readable English (zod issues as `field: message`, 5xx and network errors as
plain sentences). Any `ApiError` a page doesn't catch itself is caught
globally in `Layout.tsx` (`unhandledrejection`) and shown as a red banner —
so don't add empty `.catch(() => {})` handlers that swallow errors.

## Design

The look follows the **Leonardo Hotels design skill (`hotel-design-leonardo`)**,
chosen by the project owner on 2026-11-12 over the gold/black skill
(`hotel-design-gold`, which is for the owner's own apps — don't mix them).
Light brand look (red `#B5003B`, warm grey, white cards) with automatic dark
mode via `prefers-color-scheme`.

- **All color values live in `client/src/styles/tokens.css`**, nowhere else —
  `index.css` and the TSX files only use `var(--lh-*)`. No hex/rgb in components.
  New colors (e.g. another status tint) get a token first.
- Shell: white 64 px header with a 3 px red line (text logo, app name,
  version, user), sidebar with nav + mini calendar, drawer menu below 768 px.
  Phone layout: no page-level horizontal scroll, tap targets 44 px, tables
  scroll inside their own box.
- Primary button = red, uppercase, 44 px. Destructive actions (deactivate,
  delete, remove) must ask via `confirm()` first.
- **Deliberate deviations from the skill:** the UI stays English with
  browser-locale dates (the skill says German/TT.MM.JJJJ), and the skill's
  "standalone single HTML file, no network calls" rule doesn't apply (this is
  a client/server app).
- **Logo:** the official Leonardo logo file isn't in the repo, so the header
  and login page show the neutral text logo "LEONARDO HOTELS" (`Layout.tsx`,
  `Login.tsx`). Replace it with the official PNG (never redraw or recolor it)
  once the file is available.

## Version

Schema MAJOR.MINOR.PATCH, **single source: `version` in the root
`package.json`** (currently 0.2.0). `client/vite.config.ts` reads it at build
time and injects `__APP_VERSION__`, shown as `vX.Y.Z` in the header
(`Layout.tsx`). The `version` fields in `client/package.json` and
`server/package.json` are not used and not maintained — don't bump or read
them. Bump once per release, only after the user's go (propose the number with
a short reason): PATCH = fix, MINOR = new feature, MAJOR = big rework or data
format change; 1.0.0 = first productive use. Use `npm version <x.y.z>
--no-git-tag-version` at the repo root. There are no exports (PDF/Excel) yet;
when one is added it must state "erzeugt mit Onboarding Tracker vX.Y.Z".

## Commands

npm workspaces monorepo (`server`, `client`). Run from repo root unless noted.

```
npm install                    # installs both workspaces
npm run dev                    # server (4000) + client (5000) concurrently
npm run dev:server             # server only — tsx watch, auto-restarts on change
npm run dev:client             # client only — vite
npm run build                  # tsc + prisma generate (server), tsc + vite build (client)
npm run typecheck              # tsc --noEmit in both workspaces
```

Database (run inside `server/`, needs `DATABASE_URL` in `server/.env`):

```
npx prisma migrate dev --name <name>   # create + apply a migration (interactive; see gotcha below)
npx prisma migrate deploy              # apply existing migrations, non-interactive
npx prisma generate                    # regenerate the Prisma Client — NOT run automatically by migrate deploy
npm run prisma:seed                    # seed real locations/task catalog + one HR-central admin (password printed once to console)
npm run prisma:reset-admin-password    # -- <email> <password>  (both args optional; random password if omitted)
npm run prisma:reset-demo-employees    # DESTRUCTIVE: deletes ALL employees, seeds 5 demo employees at ATSALFRA
```

Real GM/OM names and e-mail addresses are not in git: `prisma:seed` reads
them from `server/prisma/seed-contacts.local.json` (git-ignored, keyed by
location short code). Without it the seed warns and adds a fake placeholder
contact only to locations that have none. `JWT_SECRET` and
`CREDENTIAL_ENCRYPTION_KEY` belong in Replit Secrets, never in `.replit` or
code; the server warns at startup (names only) if they fall back to the
public dev defaults. Changing `CREDENTIAL_ENCRYPTION_KEY` later makes
already-stored resource passwords undecryptable.

There is no test suite/runner configured in either workspace.

**Non-interactive migration gotcha:** `prisma migrate dev` refuses to run in
a non-interactive shell. When that happens, hand-author the migration folder
instead (`server/prisma/migrations/<timestamp>_<name>/migration.sql`) and
apply it with `npx prisma migrate deploy`, then `npx prisma generate`.
Forgetting `prisma generate` after a schema change is the most common cause
of the dev server crashing on startup (surfaces as `ECONNREFUSED
127.0.0.1:4000` in the Vite proxy log, i.e. nothing is listening — not an
auth bug even though it often first shows up as a login failure).

## Architecture

### Auth & authorization

JWT in an httpOnly cookie (`server/src/middleware/auth.ts`), 12h expiry, no
refresh — client just gets bounced to `/login` on 401. Four roles:
`hr_central`, `hr_deputy`, `location_manager`, `location_deputy` (a deputy
has identical rights to the role it stands in for; `User.isDeputyForUserId`
is informational only, not an authorization input). Authorization is
two-tier and enforced **only on the backend** per-route, never trust the
frontend redirect alone when adding an endpoint:
- `requireRole(...HR_ROLES)` gates Setup-only mutations (locations, task
  templates, users) — see the `router.use(requireRole(...))` line partway
  down `locations.ts` / `taskTemplates.ts` that splits "anyone authenticated
  can read" from "HR-only can write".
- `canAccessLocation(user, locationId)` (same file) gates everything scoped
  to a specific location: HR roles see all locations, `location_*` roles see
  only their own (`user.locationId`).

### Core data model (`server/prisma/schema.prisma`)

`Location` → `Employee` → `Task` (per-employee instance of a global
`TaskTemplate`). `Task.dueDate` is **computed backward from
`Employee.startDate`**: `dueDate = startDate - template.defaultDueDays`
(onboarding paperwork must be done *before* the employee starts, not after —
this was a deliberate fix, don't flip the sign back). Editing
`Employee.startDate` recomputes every one of that employee's task due dates
(see `PATCH /employees/:id` in `employees.ts`).

`TaskEvent` is an audit log (status changes, credential reveals, magic-link
generation) — append-only, never edited. `FeedbackStatus` is intentionally
separate from `Task.status`: it tracks whether the *external* partner
(IT/KEOS/AMS/Payroll) confirmed their side, independent of internal task
completion. `TaskResource` (link or uploaded document, attached to the
*template*, not per-employee) can optionally hold a username + AES-256-GCM
encrypted password (`server/src/lib/crypto.ts`) for the system behind a
link, so a deputy can complete a task without asking IT for access —
`passwordEncrypted` must never reach a JSON response; every route that
returns a `TaskResource` runs it through a local `sanitizeResource()` helper
first (duplicated in `taskTemplates.ts` and `tasks.ts` — keep both in sync).
Revealing a stored password (`POST /tasks/:id/resources/:id/reveal-password`)
writes a `TaskEvent` audit entry.

`Location.nextEmployeeNumber` is an atomic per-location counter for
`Employee.employeeNumber` (auto-assigned, not user-editable) — assigned via
a single `UPDATE ... RETURNING` raw query in `employees.ts` (`POST /`), not
read-then-write, so two concurrent creations at the same location can't
collide. Editable in Setup as a starting value, for hotels that already have
an existing numbering scheme before go-live.

Both `TaskTemplate` and `Task` have a `position` int for manual drag-free
reordering (swap two neighbors' `position` values in a transaction — see
`PATCH /task-templates/reorder`). Task ordering is global per template
catalog, not per-employee (moved there after user feedback; don't reintroduce
a per-employee reorder endpoint).

### Backend request flow

Express app (`server/src/index.ts`) mounts one router per resource under
`/api/*`, each with its own `router.use(requireAuth)` (and
`requireRole(...)` where needed) at the top of the file rather than global
middleware — check the top of a route file to see what's gated. A single
generic error-handling middleware at the bottom of `index.ts` logs the full
error server-side and returns a generic `{ error: "Internal server error" }`
— when debugging a 500, the real cause is only in the server console/log,
never in the response body.

`server/src/jobs/reminderJob.ts` runs once at startup and daily via
`node-cron` (`0 6 * * *`): scans open/in-progress tasks, creates an in-app
`Notification` for anything overdue or inside its reminder window, deduped
per task per day. Recipient is `assignedToUser`, falling back to all
`location_manager`/`location_deputy` at that location. Email/Teams delivery
is intentionally out of scope (in-app only).

`server/src/services/storage.ts` is a small adapter for uploaded task-resource
documents. It stores files in PostgreSQL (`StoredFile`, served by
`routes/uploads.ts`) because Replit Autoscale has no persistent filesystem —
don't switch it back to local disk. Files uploaded before that still live in
`server/uploads/` and are served/deleted via a legacy fallback. A different
backend (e.g. S3-compatible) only needs another `StorageAdapter`.

### Frontend

Vite + React Router (`client/src/App.tsx`). `ProtectedRoute` wraps
authenticated routes and optionally restricts by `roles`; `/setup/*` is the
only role-gated branch (HR only) — `SetupPage.tsx` is itself a small nested
router for Locations/Task templates/Users/Settings. `Layout.tsx` is the
persistent shell (sidebar nav + mini calendar + logout, main content area);
individual pages don't repeat that chrome.

`client/src/api/client.ts` is a thin fetch wrapper (`ApiError` on non-2xx);
page components generally call it directly and manage their own loading/error
`useState` rather than a shared data-fetching library.

## Deployment: two independent databases

This app is developed locally (Neon Postgres, no Docker — this dev machine
can't run Docker Desktop/WSL2, don't suggest it) and separately deployed to
Replit (its own Postgres, its own `DATABASE_URL`). **They are not the same
database** — confirmed by observation (different admin passwords, data
created in one doesn't appear in the other). A migration or seed run locally
does nothing to Replit and vice versa; both sides need `git pull` +
(if schema changed) `npx prisma migrate deploy && npx prisma generate` run
independently, followed by a full restart of the Replit process (not just a
shell command) for a regenerated Prisma Client to take effect.

The client dev port is **5000**, not Vite's default 5173 — `client/vite.config.ts`
and `.replit` were changed together to match Replit's expected port; keep
`.claude/launch.json` in sync with whichever port `vite.config.ts` actually
specifies.

## Working with `Bugs/*.odt` feedback files

The project owner periodically drops a `.odt` file under `Bugs/` (git-
untracked, don't commit it) containing numbered "Bug N" items, sometimes with
embedded screenshots that carry the actual requirement more precisely than
the prose. There's no Python on this machine — extract with:

```
unzip -o -q "Bugs/<file>.odt" content.xml -d <scratchpad-dir>
unzip -o -q "Bugs/<file>.odt" "media/*" -d <scratchpad-dir>   # embedded screenshots, if any
```

then strip `<text:p>`/`<text:h>` tags from `content.xml` (a short inline
`node -e` script) and `Read` any `media/imageN.png` directly — screenshots
often show the exact expected value/order/field placement that the German
prose alone doesn't fully pin down.
