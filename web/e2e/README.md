# End-to-end tests

Playwright tests cover read-only flows, mocked API behavior, and explicitly opted-in
CRUD persistence against a dedicated local test database.

## Projects

| Project  | Needs                    | Covers |
|----------|--------------------------|--------|
| `public` | only the running web app | route protection, login page, login page on a phone |
| `admin`  | admin credentials and web app; API/database for live specs | list, search, filters, details, profile (no save), navigation, notifications, phone layout, auth errors (mocked API), recommendation review (mocked API) |

`admin` is only registered when `E2E_EMAIL` and `E2E_PASSWORD` (or `E2E_STORAGE_STATE`) are set.

`auth-errors.admin.spec.ts`, `recommendation-review.admin.spec.ts`, and
`notifications.admin.spec.ts` use Playwright route mocks for the API interactions
they assert. They still require a valid admin browser session because the web app
validates the Supabase session before rendering protected pages. Notification
mock tests keep a disposable in-memory API state in the test process and verify
read/unread behavior after a page reload; they do not write to the backend database.
`notifications.real.admin.spec.ts` uses the real authenticated API and a seeded
notification identified by `E2E_NOTIFICATION_ID`. It is skipped unless mutation
tests are explicitly enabled. It captures the original read state, restores it
in `finally`, and reads it back.

`opportunities.mutations.admin.spec.ts` is skipped by default. It creates, edits,
and deletes one uniquely named record through the real API and UI, verifies the
record after reload and direct authenticated API reads, and removes any remaining
test record in `finally`. It only runs when `E2E_MUTATION_TESTS=1` and the
Playwright config validates a local database named exactly
`postgres` on port `55422`, a local Supabase API on port `55421`, and a local web
application. The Playwright config starts a separate API process on port 4001
using that database URL. Tests also check Docker project labels, running
containers, the isolated network and port bindings, a database marker, and that
the browser's authenticated user exists in the same Supabase project's database.
These checks do not replace operator verification that the project is disposable.
Never use development, staging, production, or shared data.

The opportunity cleanup deletes only records with the exact UUID-bearing initial
or updated title, including when a create response is lost, and verifies absence.
The profile persistence test saves the singleton profile, restores its original
values and checks them through the API, and removes its unreferenced test tags.
Run mutation tests serially and do not run multiple mutation suites concurrently.

The mutation project requires the isolated test database to have all repository
Supabase migrations applied and an admin test user/session from the local Supabase
project. The mutation test is intentionally opt-in and must not run against the
normal API on port 4000.

## Run

```bash
npm run dev                          # web app (admin tests also need the API on :4000)
npm run test:e2e:public              # no credentials needed
E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e   # all projects
```

### Isolated mutation tests

Create a dedicated local Supabase test stack separate from the normal development
stack. Configure its local API on port `55421` and PostgreSQL on port `55422`;
apply every repository migration to it, create a test admin account, and save
that account's browser session state. The API server is started by Playwright
with `DATABASE_URL` set to `E2E_TEST_DATABASE_URL` and `SUPABASE_URL` set to
`E2E_TEST_SUPABASE_URL`. The config refuses hosted URLs, non-local database
hosts, and the default local Supabase ports.

Independently verify that the running Docker containers, their project label and
temporary Supabase workdir, published ports, database, auth service, admin user,
and seed data all belong to a disposable project. Set `E2E_TEST_PROJECT_ID` to
that project's Docker/Supabase project ID. In that verified database only, create
`public.e2e_isolation_marker` with one `marker text PRIMARY KEY` column and insert
a fresh, unique marker; set `E2E_ISOLATION_MARKER` to that value. Select the ID of
the dedicated seeded notification with message `Found 2 new relevant calls.`
and its two seeded opportunities, and set `E2E_NOTIFICATION_ID`. Keep the marker,
credentials, and saved session in private local environment files, not Git.

```bash
# Run from web/, after creating a separate local Supabase stack on API/DB
# ports 55421/55422, applying migrations, and preparing a test admin session.
E2E_MUTATION_TESTS=1 \
E2E_TEST_DATABASE_URL=postgres://USER:PASSWORD@127.0.0.1:55422/postgres \
E2E_TEST_SUPABASE_URL=http://127.0.0.1:55421 \
E2E_TEST_PROJECT_ID=your-disposable-project \
E2E_ISOLATION_MARKER=your-unique-database-marker \
E2E_NOTIFICATION_ID=123 \
E2E_STORAGE_STATE=e2e/.auth/local-test-admin.json \
E2E_START_SERVER=1 \
npm run test:e2e -- --project=admin --workers=1
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the
matching local Supabase project when running the test. The browser session in
`E2E_STORAGE_STATE` must have been created against that same project. Never store
credentials or session state in Git.

First run on a machine without Chrome: `npx playwright install chromium`.
To use an installed Google Chrome instead: `E2E_BROWSER_CHANNEL=chrome`.

## Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `E2E_BASE_URL` | web app URL | `http://localhost:3000` |
| `E2E_API_URL` | API URL (used to find suitable calls) | `http://localhost:4000` |
| `E2E_EMAIL`, `E2E_PASSWORD` | admin login for the `admin` project | none |
| `E2E_STORAGE_STATE` | path to a saved signed-in session, instead of a login | none |
| `E2E_BROWSER_CHANNEL` | `chrome` to use installed Chrome | bundled Chromium |
| `E2E_START_SERVER` | start `npm run start` before testing (needs `npm run build`) | off |
| `E2E_MUTATION_TESTS` | opt into isolated create/edit/delete persistence tests (`1` only) | off |
| `E2E_TEST_DATABASE_URL` | local PostgreSQL connection for the isolated Supabase stack on port 55422 | none |
| `E2E_TEST_SUPABASE_URL` | URL of the matching local Supabase test project | none |
| `E2E_TEST_PROJECT_ID` | Supabase Docker project identity | none |
| `E2E_ISOLATION_MARKER` | Marker stored in the dedicated test database | none |
| `E2E_NOTIFICATION_ID` | ID of the dedicated seeded notification | none |

Never commit credentials. Saved sessions live in `e2e/.auth/` (git-ignored).

The mocked notification, validation, dashboard, profile-failure and
recommendation-review tests verify frontend behavior, not persistence in a live
backend. Recommendation mutation and rescoring do not currently have a real
browser-to-database persistence journey. Some existing real-data tests require
suitable seeded calls and may skip without them. Authentication state must belong
to the same isolated project.

## Focused unit tests

Run `npm run test:unit` from `web/`. Vitest tests the form-to-API mapper and
mocked transport/notification service behavior; these are not browser or
database integration tests.
