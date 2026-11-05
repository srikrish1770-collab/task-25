# Meridian CRM

A connected enterprise CRM frontend built in this workspace with React, strict TypeScript, Vite, Redux Toolkit, React Router, Tailwind CSS, Recharts, Lucide icons, and Zod validation. This is a browser-local demo, with no production authentication or backend.

## Run

Requires Node.js 22.12+ (verified with Node 24).

```sh
npm install
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
- **Sales pipeline:** six stages, counts and total value, full CRUD, stage select controls operable with keyboard/touch, owner/stage/date filters, and a switchable list view. Board scrolling is contained within the board. Drag and drop is intentionally omitted; the stage controls work on all devices.
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

## Deployment and limitations

`npm run build` writes a static SPA to `dist/`. A Vercel SPA rewrite is supplied; other hosts must serve `index.html` for non-asset routes. Nothing has been published or deployed. Data is editable demo content: there are no APIs, real emails, organization permissions, server backups, currency conversion, historical stage audit ledger, or multi-user synchronization. This is a complete local frontend, not a production CRM service.
