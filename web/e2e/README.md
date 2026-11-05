# End-to-end tests

Playwright browser tests for the stable, read-only flows. Nothing here creates, edits or deletes data.

## Projects

| Project  | Needs                    | Covers |
|----------|--------------------------|--------|
| `public` | only the running web app | route protection, login page, login page on a phone |
| `admin`  | admin credentials, API and database | list, search, filters, details, profile (no save), navigation, phone layout, 401/403 handling (mocked API) |

`admin` is only registered when `E2E_EMAIL` and `E2E_PASSWORD` (or `E2E_STORAGE_STATE`) are set.

`auth-errors.admin.spec.ts` mocks the API responses (401, 403, 500, network failure) with `page.route`, so it does not need the API running, but it still needs a real admin session: the web server validates the Supabase session before the page renders. Server-rendered detail/edit pages call the API from the server, which Playwright cannot intercept, so their 401/403 handling is not covered by this spec.

## Run

```bash
npm run dev                          # web app (admin tests also need the API on :4000)
npm run test:e2e:public              # no credentials needed
E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e   # all projects
```

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

Never commit credentials. Saved sessions live in `e2e/.auth/` (git-ignored).

## Not covered on purpose

Add / edit / delete opportunity, profile save and rescoring change shared data. They need an isolated test database; until one exists they are not automated.
