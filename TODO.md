# TODO / Session log

## 2026-07-09 — done today

- Added `CLAUDE.md` (repo guide for future Claude Code sessions).
- Fixed the Locations page: location tiles + active-location summary +
  "Employees" header now stay pinned (`position: sticky`) while a long
  employee list scrolls in its own bounded area — verified with 40 test
  employees.
- Added a "Reason" column (between Status and Due date) to the employee's
  onboarding-checklist table, showing the short reason captured when a task
  is marked "not required".
- Added `npm run prisma:reset-demo-employees` (`server/prisma/reset-demo-employees.ts`):
  wipes all employees and seeds 5 clean demo employees at ATSALFRA with
  staggered entry dates, for the upcoming HR practice test.
- **Milestone:** user declared Ausbaustufe 1 (MVP) feature-complete — no
  more ad-hoc items found. Data reset for a "praxisnah" test round with the
  HR-responsible person in the dev environment (Replit). See the "Project
  status" note added to `CLAUDE.md`.

## Open / next steps

- Waiting on feedback from the HR practice-test round before starting any
  Ausbaustufe 2 work (see `CLAUDE.md` → Project status). Don't proactively
  propose new features until that feedback comes back.
- User still needs to actually run `git pull` + `npm run
  prisma:reset-demo-employees` inside Replit's shell (only run locally so
  far, for verification).
- No other known bugs or pending fixes as of end of day.

## Where to pick up tomorrow

Wait for either: (a) the next `Bugs/*.odt` feedback batch from the HR
practice test, or (b) explicit word from the user that testing is done and
we're moving on to Ausbaustufe 2. Don't start Ausbaustufe 2 planning unless
asked.
