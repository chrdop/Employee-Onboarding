# TODO / Session log

## 2026-11-12 (später) — Umbau auf das Leonardo-Design

**Erledigt**
- Design-Skill-Vergleich Gold gegen Leonardo; Entscheidung des Projektinhabers: **Leonardo** (siehe CLAUDE.md, Abschnitt Design).
- App komplett umgestellt: Tokens in `client/src/styles/tokens.css`, neues `index.css`, weißer Header mit roter Linie und Textlogo, Handy-Menü, Dark Mode, Fokus-Ringe, 44-px-Buttons, Bestätigungsdialoge für zerstörende Aktionen. Keine Farbwerte mehr außerhalb von `tokens.css`. Commit siehe `git log`.
- Geprüft im Browser: Desktop, 375 px (kein horizontales Scrollen), Dark Mode, Login, Locations, Daily Report, Mitarbeiter, Setup > Task templates.

**Offen**
- Offizielles Leonardo-Logo (PNG) fehlt im Projekt, bis dahin Textlogo "LEONARDO HOTELS" in Header und Login.
- Nicht einzeln angesehen: Notifications-Seite und Dropdown der Glocke, Setup > Users/Locations/Settings, Task-Detailseite auf dem Handy. Sie nutzen dieselben Klassen, ein kurzer Blick fehlt aber.
- ~~Versionsnummer nach dem Umbau~~ erledigt: auf 0.3.0 angehoben (MINOR, neue Optik), nach Go des Projektinhabers.
- ~~Server-Startpfad~~ erledigt: `.replit` (Deployment `run`) und `server/package.json` (`start`, `main`) zeigen jetzt auf `dist/src/index.js`, Start lokal geprüft. Auslieferung des Client-Builds eingebaut (`server/src/index.ts`: statische Dateien aus `client/dist` plus SPA-Fallback, ausgenommen `/api`, `/uploads`, `/assets`). Deployment-`run` setzt `PORT=5000` und `NODE_ENV=production`. Lokal geprüft, in Replit noch nicht.
- Weiter offen aus früher: Replit-Secrets und Migration, Doku-Abschnitt "Veröffentlichung", README (Port 5000).

**Wo weitermachen:** kurzer Blick auf die nicht geprüften Seiten, dann Version/Startpfad.

## 2026-11-12 — Prüfung gegen Skill hotel-app-standards, Risiken behoben

**Erledigt**
- JWT_SECRET aus der `.replit` entfernt, `Bugs/` in die `.gitignore`, Startwarnung bei Dev-Default-Schlüsseln (`dc10264`).
- Echte GM/OM-Kontakte aus `seed.ts` in lokale, ignorierte `seed-contacts.local.json` verschoben (`a61d449`).
- Hochgeladene Task-Dokumente liegen jetzt in der Datenbank statt auf der Platte, wegen Autoscale (`0f947a6`).

**Offen**
- In Replit: `JWT_SECRET` und `CREDENTIAL_ENCRYPTION_KEY` unter Secrets setzen. Der Schlüssel jetzt, bevor echte Passwörter gespeichert werden.
- In Replit: `git pull`, `npx prisma migrate deploy`, `npx prisma generate`, voller Neustart (neue Tabelle `stored_files`).
- Echte Kontakte stehen weiter in der Git-Historie. Bereinigen nur nach Rückfrage (würde Historie umschreiben).
- Noch nicht umgesetzt aus dem Skill-Bericht: Versionsnummer (eine Quelle, Header `vX.Y.Z`, Vorschlag 0.2.0), `.catch` mit deutschen Meldungen bei Ladeaufrufen, lesbare Zod-Fehler, CLAUDE.md-Abschnitte Version und Veröffentlichung, README korrigieren (Port 5000).

**Wo weitermachen:** Doku (Punkt 4) und Prüfung mit dem Skill hotel-design-gold. Fehler/Warnungen (Punkt 3) sind erledigt, siehe Nachtrag unten.

### Nachtrag 2026-11-12: Englisch durchgängig + Fehlerbehandlung
- Entscheidung des Projektinhabers: App konsequent auf Englisch (überstimmt die deutsche Fehlertext-Regel des Skills). Letzte deutsche Texte ersetzt: Footer-Satz in Locations, Server- und Seed-Warnungen, Platzhalter-Kontakt, Kalender-Monatsnamen (`en-GB`). Stammdaten (Hotelnamen, Task-Titel) bleiben unverändert.
- Fehler sind nicht mehr still: lesbare englische Meldungen im API-Client, zentrales rotes Hinweisfeld im Layout für jeden nicht abgefangenen API-Fehler.

### Nachtrag 2026-11-12: Version 0.2.0
- Version auf 0.2.0 angehoben, eine Quelle (Root-`package.json`), Anzeige `v0.2.0` in der Sidebar (Commit siehe `git log`).
- **Offen, wichtig für die Veröffentlichung:** Der Server baut nach `server/dist/src/index.js` (tsconfig `rootDir: "."`), aber `.replit` (Deployment `run`) und `server/package.json` (`start`) rufen `server/dist/index.js` auf. Dieser Pfad existiert nicht, eine veröffentlichte App würde so nicht starten. Vor dem ersten Republish prüfen und korrigieren.

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
