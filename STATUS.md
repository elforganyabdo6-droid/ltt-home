# STATUS

Per-item evidence state, using the skill's ladder. Nothing is listed at a level
higher than the evidence supports.

| State | Means |
|---|---|
| GENERATED | Written. Nothing executed. |
| RUN | Executed without crashing. Behaviour unconfirmed. |
| TESTED | A specific case was exercised and the output recorded. |
| VERIFIED | Acceptance criteria checked, including at least one negative case. |

Last updated after the commit that made the data layer serverless-safe.

## Scope and documentation

| Item | State |
|---|---|
| PROJECT-SCOPE.md | VERIFIED — five features, non-goals and data classification all filled |
| PROJECT.md | VERIFIED — matches what was built, including the recorded stack deviation |
| AI-RULES.md | VERIFIED |
| SECURITY-CHECKLIST.md | VERIFIED — open gaps recorded as gaps, not omitted |
| TEST-CHECKLIST.md | VERIFIED — every ticked line has recorded evidence |
| DEBUG-REPORT.md | VERIFIED — six defects and one rejected hypothesis |
| README.md | VERIFIED |
| lib/db/README.md | VERIFIED |

## Backend

| Item | State | Evidence |
|---|---|---|
| SQLite schema and seeding | VERIFIED | 640 rows seeded; transactional; seeds only when empty |
| Deterministic generator | VERIFIED | Identical dataset across file-backed and in-memory runs |
| Churn scoring | VERIFIED | Distribution measured and calibrated to 69/22/9 |
| Request validation | VERIFIED | 13 negative cases return 400/404 |
| SQL injection defence | VERIFIED | Two attempts rejected; 640-row table intact afterwards |
| `GET /api/kpis` | VERIFIED | Happy path, filtered, invalid enum, empty set |
| `GET /api/customers` | VERIFIED | Filter, search, sort both directions, pagination, empty set |
| `GET /api/customers/[id]` | VERIFIED | 200, 404 unknown, 400 malformed |
| `GET /api/analytics/churn-trend` | TESTED | 200 with 12 months; no negative case applies (takes no parameters) |
| `GET /api/analytics/factors` | VERIFIED | 200; invalid filter rejected |
| `GET /api/analytics/breakdown` | VERIFIED | All 7 dimensions; unknown dimension rejected; empty set |
| `GET /api/analytics/risk-distribution` | VERIFIED | 200; always returns all three bands |
| `GET /api/export` | VERIFIED | 3 reports; BOM checked; unknown and missing report rejected |
| `POST /api/dev/reseed` | VERIFIED | Works in development; 404 in production |
| Persistence across restart | VERIFIED | Marker row survived a full stop/start; see TEST-CHECKLIST.md |

## Frontend

| Item | State | Evidence |
|---|---|---|
| RTL Arabic layout | VERIFIED | `lang="ar" dir="rtl"`; no horizontal overflow at 1440 |
| Cairo typeface | VERIFIED | Computed font-family confirms Cairo with fallback |
| Design tokens, light / dark / system | VERIFIED | All three states produce correct ground and ink colours |
| Six KPI tiles | VERIFIED | Render and recompute on filter change (640 → 181 → 640) |
| Filter bar | VERIFIED | Every control drives the API; reset restores |
| Trend line chart | TESTED | Renders, all marks inside viewBox, hover wired |
| Risk donut | TESTED | Renders; segments clickable and drive the risk filter |
| Ranked bar charts | TESTED | Render; all marks inside viewBox; no negative widths |
| Column charts | TESTED | Render; all marks inside viewBox |
| Customer table | VERIFIED | Sort, search, paginate, keyboard activation, empty state |
| Customer drawer | VERIFIED | Opens with factors, confidence and action; Escape closes |
| Alert strip | TESTED | Derived from data; thresholds stated in each message |
| Predicted vs actual labelling | VERIFIED | Every panel carries a provenance tag |
| Model disclosure | VERIFIED | States it is not a trained model |
| CSV export | VERIFIED | BOM `efbbbf`; row count matches the KPI |
| Responsive chart re-measurement | **GENERATED** | Could not be observed — ResizeObserver does not fire in a pane that is not compositing. See DEBUG-REPORT.md §7. Needs a check in a real browser. |
| Mobile layout on hardware | **GENERATED** | Responsive by construction; not exercised on a device |

## Quality gates

| Item | State | Evidence |
|---|---|---|
| `npm run build` | VERIFIED | Succeeds; all 8 API routes correctly `ƒ` (Dynamic) |
| `npm run lint` | VERIFIED | Clean; 5 earlier errors were real defects, now fixed |
| `npm run typecheck` | VERIFIED | Clean |
| Automated test suite | **NOT STARTED** | None exists. Every result was produced by hand, so a regression can reappear silently. First thing V2 should gain. |
| Accessibility audit | **GENERATED** | Keyboard access, focus rings, `aria-sort`, `aria-current`, dialog semantics built in and keyboard-exercised; no screen reader used |
| Cross-browser | **TESTED (one engine)** | One Chromium-based browser only |
| Load / concurrency | **NOT STARTED** | — |

## Git and deployment

| Item | State | Evidence |
|---|---|---|
| Meaningful commit history | VERIFIED | Six commits, each one logical change with the reasoning recorded |
| Pushed to GitHub | VERIFIED | `elforganyabdo6-droid/ltt-home`, `main` up to date |
| No secrets committed | VERIFIED | `.env*` and `/data/*.db` ignored; the project holds no secrets |
| Serverless-safe data layer | VERIFIED | Production build with `VERCEL=1` serves the full dataset |
| Vercel project created | **NOT STARTED** | Requires the account owner to authenticate |
| Production deployment | **NOT STARTED** | Blocked on the above |
| Live URL verified | **NOT STARTED** | Blocked on the above |

## Honest summary

The application is verified locally, in both development and a production build,
including the serverless database path and thirteen negative cases. It is **not
deployed**, so nothing about its live behaviour is claimed.

The largest genuine gap is the absence of an automated test suite: every result in
TEST-CHECKLIST.md was produced by hand and will not re-run itself.

A local verified build proves the development workflow. It does not approve this
application for production telecom workloads — authentication, authorization, rate
limiting and audit logging are all absent by design in V1.
