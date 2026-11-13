# Meridian CRM

A connected enterprise CRM frontend built in this workspace with React, strict TypeScript, Vite, Redux Toolkit, React Router, Tailwind CSS, Recharts, Lucide icons, and Zod validation. This is a browser-local demo, with no production authentication or backend.

## Run

Use Node.js 24.x (verified with Node 24.16.0). The package engine is pinned to this Vercel-supported major version. In particular, Vitest 5 requires `^22.12.0 || ^24.0.0 || >=26.0.0`; using Node 18 or 20 is not compatible with the test suite. Dependency versions have not been downgraded.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To build or validate:

```sh
npm run typecheck
npm test
npm run build
npx playwright test
```

Browser tests use the installed Microsoft Edge browser. Change `channel` in `playwright.config.ts` if using another supported browser. Playwright starts and stops its own Vite server. `npm run preview` serves the production output. No lint tool is configured. `npm run format` formats source and configuration.

## Modules

- **Overview:** five calculated KPIs; revenue/open-pipeline trends; lead-source donut; stage distribution; owner sales performance; recent activity; unfinished tasks; overdue open deals. Date filters change the analytics cohort, and Export report downloads the current metrics as CSV.
- **Leads:** searchable, sortable, paginated directory; status/source/owner filters; validated CRUD; details and connected records. A Qualified lead can become a linked customer, with an optional opportunity. Repeat conversion is blocked. A matching customer (same email and company, or originating lead) is reused. The Converted status is controlled by the conversion action.
- **Sales pipeline:** six stages, counts and total value, full CRUD, stage select controls operable with keyboard/touch, owner/stage/date filters, and a switchable list view. Board scrolling is contained within the board. Fine-pointer devices support drag and drop; accessible stage controls work on all devices.
- **Customers:** searchable directory, contact details, address, notes, deals, tasks, and chronological activity. Customer company changes propagate to linked records. Deletion requires confirmation and retains linked records with references cleared.
- **Tasks:** search, sorting, owner/priority/status/deadline filters; overdue/today/upcoming/completed views; create/edit/delete; complete and reopen. Past unfinished tasks show both an overdue label and color.
- **Activities:** log calls, meetings, email activities, notes, and follow-ups; search/type/owner filters; edit and delete; chronological profiles; create a linked follow-up task. Logged email entries never send messages.

Global search returns navigable lead, customer, deal, and task results. The desktop sidebar collapses; mobile navigation opens with a backdrop. Routes support browser history, direct profile links, missing-record states, and a 404 page. Native modal dialogs trap focus, support Escape, and restore the trigger. Forms show labeled field errors and block duplicate submission. Reduced-motion preferences disable CSS transitions and animations; charts render without animated delays. The dashboard chunk has a real loading skeleton. An application error boundary offers reload recovery.

## Organization

```text
src/
  app/          Redux store, typed hooks, analytics selector, business-rule tests
  components/   Shared accessible dialog and schema-validated record form
  data/         Typed record model, status definitions, connected demo seed
  features/     Dashboard charts, record directories, pipeline, record profiles
  services/     Validated localStorage persistence boundary
  utils/        Pure record queries and ordering tests
  main.tsx      Router, responsive shell, global search, reset and notifications
  styles.css    Tailwind import and responsive design system
  test-setup.ts Testing Library and jsdom setup
 e2e/           Edge browser interaction and responsive checks
```

The CRM slice owns the five domains as one serializable database so conversion and relationship cleanup are atomic. IDs are stable; new records use UUIDs. Relationships use IDs, and related labels resolve from live records. Analytics use a memoized selector. Shared forms support creation and correctly initialized editing; shared directories provide filtering, sorting and clamped pagination.

## Persistence and demo reset

The dedicated persistence service uses the versioned `meridian-crm-v1` localStorage key. First use seeds and immediately persists connected records. Every Redux mutation writes the complete database. Empty databases and deleted records remain empty after refresh. Zod validates all persisted record fields and unique IDs; malformed or incompatible data falls back to a fresh usable demo. Storage failures leave the app usable in memory and show a warning on mutations. Reset demo data requires confirmation and replaces the saved database. Clearing browser data also removes the workspace. Separate browsers, devices, and private sessions do not synchronize.

Dates use ISO strings. Due/close dates use `YYYY-MM-DD`, activity instants normalize to UTC ISO timestamps, and UI date/time inputs use local time. Date-only display avoids timezone day shifts. Creation timestamps are automatic and immutable through the form. Record date is separate from creation time. Monetary values use USD; negative values are rejected.

## Metric definitions

The range selector defines a rolling **creation-date cohort**, using each record's `createdAt` timestamp:

- Total leads: leads created during the range, including converted/unqualified leads.
- Active customers: customers created during the range whose current status is Active.
- Pipeline value: sum of cohort deals in stages other than Closed Won/Closed Lost.
- Won revenue: sum of cohort deals currently in Closed Won.
- Conversion rate: converted cohort leads divided by all cohort leads, multiplied by 100; zero when there are no leads.
- Trend: six equally spaced creation-date buckets; sums of currently won and currently open deal values. This is a cohort analysis, not historical stage snapshots or an accounting ledger.
- Sources: counts of cohort leads by source. Stage bars: count share, alongside value totals. Sales performance: cohort won value per owner.

Recent activities, upcoming/overdue tasks, and deals requiring attention are operational lists across all records and are not affected by the analytics range. Task overdue means its date precedes the browser's local calendar date and status is not Completed. Open deal attention means its expected close date has passed and its stage is not closed.

## Verification

Vitest covers conversion, duplicate protection, stage-driven analytics, empty cohorts, safe linked deletion, task reopening, storage recovery, persistence of deletion, field validation, editing, combined filters, pagination reset, and CRUD. Playwright covers responsive routes at 375/768/1024/1440px, page overflow, runtime errors, modal focus/Escape, CRUD across reloads, conversion, stage persistence and metrics, task completion/reopening, activity/profile relationships and follow-up tasks. It writes dashboard screenshots under ignored `test-results/`.

## Vercel deployment

Use these project settings:

| Setting          | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| Framework Preset | Vite                                                                         |
| Root Directory   | The folder containing `package.json`, `package-lock.json`, and `vercel.json` |
| Build Command    | `npm run build`                                                              |
| Output Directory | `dist`                                                                       |
| Install Command  | `npm ci`                                                                     |
| Node.js Version  | `24.x`                                                                       |

**Root Directory depends on the repository layout, not the ZIP filename.** This workspace has `package.json` directly at its top level. If these files are committed directly at your repository root, leave Vercel Root Directory at the repository root (the default, `.`). If you upload or commit the ZIP's parent folder and the repository contains `task 25/package.json`, set Vercel Root Directory to **`task 25`**. Do not select `dist` as Root Directory. The remote repository layout must be checked before selecting the deployment root.

The BOM-free UTF-8 `vercel.json` explicitly selects Vite, runs the production build, publishes `dist`, and rewrites `/(.*)` to `/index.html` for client-side routing. This follows [Vercel's Vite SPA deep-linking guidance](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas). Existing JavaScript, CSS, and public files must remain available as static assets. Node 24.x is selected by `package.json` engines and is [supported by Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

Run from the selected project root before deployment:

```sh
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('Valid JSON')"
npm ci
npm run typecheck
npm test
npm run build
npm run test:production
```

`test:production` starts `vite preview` against the actual `dist` output, independently of the development-server tests. It checks the exact deployment configuration, BOM absence, case-sensitive relative imports (including dynamic imports), generated assets and their MIME types/contents, client-side navigation, and direct navigation/refresh on all five module routes and their actual record detail URLs. It also verifies saved edits survive a refresh. Tests use a fresh, isolated Edge browser context and never access an existing user's browser profile or saved workspace. Microsoft Edge must be installed locally to run these browser checks; browser checks are not part of Vercel's build command.

These are **local production-preview checks**, not a verified Vercel deployment. After deployment, repeat direct navigation and refresh on `/leads`, `/customers`, `/deals`, `/tasks`, `/activities`, and a record detail URL, and check that asset requests return their proper content types. Vite preview does not execute Vercel's routing service or validate your remote project's Root Directory setting. No deployment has been performed or verified by these changes.

Configuration changes do not change the localStorage key, demo seed, record schema, UI, or application behavior. Saved demo records remain in their original browser and origin. Moving to a different hostname creates a different storage origin, so data saved on localhost or another deployment URL does not automatically appear on the new URL; the original data is not deleted.

## Limitations

`npm run build` writes a static SPA to `dist/`. Other static hosts must serve `index.html` for non-asset CRM routes. Data is editable demo content: there are no APIs, real emails, server-enforced organization permissions, server backups, currency conversion, historical stage audit ledger, or multi-user synchronization. This is a complete local frontend, not a production CRM service.

## User panel and demo authentication

The existing React Router, CRM Redux slice, record models, seed data, forms, tables, Recharts dashboard and design tokens are reused by both panels. No separate design files or authentication API were present; the user panel follows the existing Meridian admin styling. Existing CRM data remains under `meridian-crm-v1`; accounts/preferences/read state use `meridian-accounts-v1`. Invalid stored account data resets only the account demo. Theme preferences use the existing theme key. Deployment configuration is unchanged.

Sign in at `/login`. Initial password for all demo accounts: **`Meridian2026!`**.

| Account | Role | Access |
| --- | --- | --- |
| admin@meridian.demo | Admin / Alex Morgan | All records, assignment, deletion and demo reset |
| manager@meridian.demo | Manager / Olivia Brooks | Own records plus Sarah Chen and James Wilson's records; assignment within that team; deletion and team reports |
| employee@meridian.demo | Employee / James Wilson | Own records, creation/editing, task completion, personal reports |
| sales@meridian.demo | Sales Representative / Sarah Chen | Own records, creation/editing, conversion, personal reports |

Employees and sales representatives cannot delete records or assign records to other owners. Managers cannot access Alex Morgan's records. Routes, global search, related record pickers, details, metrics and exports all use the same ownership scope. Redux middleware checks current ownership, new assignments, linked records, conversion, deletion and workspace reset. Record owner identifiers stay stable when profile display names change, preserving existing relationships. The original module routes remain available to Admin after signing in; `/admin` redirects Admin to the shared overview and denies other roles. Signed-out visits to protected routes redirect to `/login`.

New routes: `/forgot-password`, `/verify-otp`, `/reset-password`, `/reports`, `/notifications`, `/settings`, `/access-denied`. The existing overview, lead, deal, customer, task and activity list/detail routes serve role-appropriate records. Dashboard statistics and target progress recalculate from shared records. Reports support inclusive creation-date boundaries, zero-safe conversion/task completion, won/lost counts, activity breakdown and permitted CSV downloads. Managers and Admin see owner revenue summaries. Lead priority filtering and reset controls complement the existing filters. Fine-pointer devices can drag deals between stages; touch devices use stage selects without competing drag gestures. Lead/customer/deal/activity details can schedule linked follow-up tasks.

Settings persist profile name, email, target and reminder preference. Header/sidebar display the updated profile. Password changes require the current password, confirmation, and at least 12 characters containing uppercase, lowercase, number and symbol. Password values are never logged; updated demo passwords are stored as SHA-256 digests, which are **not production password storage**.

Recovery is explicitly simulated: no email, OTP, SMS or network request is sent. A random demo verification code is shown on-screen, expires after five minutes, and allows five attempts. Verification state stays in memory; refreshing recovery screens requires starting again. Reset updates only the selected local account. Signing out clears the local session. Sessions are restored from this browser's local storage; there are no server tokens, expiry enforcement or cross-device sessions.

Notifications derive deterministic identifiers from accessible lead assignments, due/overdue tasks, upcoming meetings/follow-ups within seven days, and closed deal updates. Mark-one/all read states persist per account and repeated rendering does not duplicate notifications. The reminder preference suppresses task and meeting reminders. These are browser-local current-state reminders, not a historical event log or background/push service: updates appear when the UI renders while open. No messages or emails are sent when logging activity.

**Security/integration limitation:** all authorization is a frontend simulation. Anyone with browser developer tools can alter data, permissions, stored sessions or password digests. There is no backend, real identity provider, email delivery, server-side authorization, push worker or multi-user synchronization. Production integration must replace local auth and persistence with authenticated APIs and enforce ownership/team permissions on the server. No API endpoints or secrets have been invented.

## Validation of the user panel

New unit tests cover session state, owner/team scope, mutation restrictions, password rules and per-account notification read deduplication. Browser tests cover the original Admin workflows after sign-in, simulated recovery, user access restrictions, persistent profile/read state, logout, user-owned record changes, and manager team boundaries. The user-route viewport matrix includes 320, 375, 390, 428, 768, 820, 1024, 1280, 1440 and 1920 pixels, with 900px and 400px heights. Existing theme checks exercise light/dark layouts, mobile drawers, small-height dialogs and pipeline changes. Run `npm test`, `npm run build`, `npm run test:e2e`, and `npm run test:production`. No lint command is available in this repository.
