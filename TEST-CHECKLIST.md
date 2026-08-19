# TEST CHECKLIST

Executed results, not intentions. Each item records what was actually run and what
came back. Anything not executed is marked `[ ]` and says why.

Environment: Node 24.19.0, npm 11.17.0, Next.js 16.3.1, Windows 11.
Two runs: development on port 3000, and a production build with `VERCEL=1` on port
3100 to exercise the in-memory database path.

## Build

- [x] `npm run build` succeeds — compiled in 8.1s; all 8 API routes reported `ƒ`
      (Dynamic), which is correct for database-backed handlers and confirms none
      were wrongly prerendered
- [x] `npm run lint` succeeds — clean; previously 5 errors, see DEBUG-REPORT.md §3
- [x] `npm run typecheck` succeeds — `next typegen && tsc --noEmit`, clean

## Main workflow

- [x] Page loads — `GET /` → 200, `<html lang="ar" dir="rtl">`
- [x] Data loads — six KPI tiles rendered; 640 customers
- [x] Cairo font applied — computed `font-family: Cairo, "Cairo Fallback", …`
- [x] Design tokens resolve — `body` background `rgb(238,242,247)` = `#eef2f7`
- [x] Filters recompute every figure — region → Tripoli changed the total from
      **640 → 181**; reset returned **640**
- [x] Reset control appears only when a filter is active, and reports the count
- [x] View switching works — all six views render; heading and description update
- [x] Sorting works — `?sort=tenure&dir=asc` returned tenure 1; `dir=desc` returned 60
- [x] Search works — `?q=LTT-100017` returned exactly that subscriber
- [x] Pagination works — `pageSize=2` honoured; page clamps to the last real page
      when a filter narrows the result set
- [x] Drill-down works — clicking a row opened the drawer for
      `نور الزنتاني` with factor breakdown, model confidence, and a recommended action
- [x] At-risk view shows only medium/high — page one contained only `مرتفع`
- [x] Totals agree — footer `عرض 10 من 198 عميل`, `/api/customers?atRisk=true`
      total 198, `/api/kpis` atRiskCustomers 198
- [x] Predicted and actual are visibly distinguished — trend panel tagged
      «بيانات فعلية · تاريخية», every model panel tagged «تنبؤ النموذج»
- [x] Model confidence shown wherever a probability is — table column and drawer
- [x] Model disclosure states it is not a trained model, on the prediction view
- [x] Data survives a restart — **proven with a marker row, not by comparing
      values.** Because the dataset is deterministic, identical data after a restart
      is equally consistent with regeneration, so that comparison proves nothing on
      its own. Instead a row `LTT-999001` was inserted directly into
      `data/churn.db` by a separate process; the API returned it (200), proving it
      reads that same file rather than a private copy. After a full server stop and
      start the marker was still served and the count was **641**, proving the data
      persisted and the seed did not re-run. The marker was then removed and the
      count returned to 640 with the row 404ing.
- [x] CSV export works — BOM verified as `efbbbf`; 59 data rows for the high-risk
      report, matching the KPI high-risk count of 59
- [x] Export honours active filters
- [x] Theme cycles system → dark → light — dark ground `rgb(10,20,32)`, dark ink
      `rgb(238,244,250)`, light ground `rgb(238,242,247)`; third click removes the
      attribute, returning to system

## Negative tests

Every case below was executed with `curl`.

| Case | Request | Expected | Got |
|---|---|---|---|
| Invalid enum | `?region=atlantis` | 400 | **400** + allowed values listed |
| Invalid risk | `?risk=extreme` | 400 | **400** |
| Unknown sort key | `?sort=password` | 400 | **400** |
| SQL injection via sort | `?sort=c.id;DROP TABLE customers` | 400 | **400** |
| SQL injection via enum | `?region=' OR 1=1--` | 400 | **400** |
| Invalid direction | `?dir=sideways` | 400 | **400** |
| Non-numeric page | `?page=abc` | 400 | **400** |
| Unknown group-by | `?by=secret_column` | 400 | **400** |
| Unknown report | `?report=everything` | 400 | **400** |
| Missing report | `/api/export` | 400 | **400** |
| Unknown subscriber | `/api/customers/LTT-999999` | 404 | **404** |
| Malformed id | `/api/customers/DROP-TABLE` | 400 | **400** |
| Over-long search | `?q=` + 80 chars | 400 | **400** |
| Empty result set | six valid filters matching nothing | empty state, no crash | **200**, `rows: []`, `total: 0` |
| Aggregates over empty set | same filters on `/api/kpis` | zeros, not null/NaN | **all zeros** — SQL `AVG` returns NULL over an empty set and is coalesced |
| Breakdown over empty set | same filters on `/api/analytics/breakdown` | empty array | **`rows: []`** |

- [x] Table intact after both injection attempts — `/api/kpis` still reported 640
      customers afterwards
- [x] Errors carry a useful message and no stack trace, SQL, or file path
- [x] 400 and 404 are distinguished — malformed id is 400, absent id is 404

## Deployment

- [x] Production build serves correctly — `npm start` with `VERCEL=1`, port 3100
- [x] In-memory database path works — identical dataset to the file-backed run,
      proving the generator is deterministic
- [x] Development-only route is absent in production — `POST /api/dev/reseed`
      returned **404** with `NODE_ENV=production`
- [x] No environment variables required — the project holds no secrets
- [x] Arabic text renders correctly in the production build
- [x] Browser console has no errors — checked on the production build
- [x] No horizontal page overflow — `document.body.scrollWidth` 1430 at a 1440
      viewport
- [ ] **Live Vercel URL opens** — not yet deployed. Requires the account owner to
      authenticate; the project is otherwise deploy-ready.
- [ ] **Deployed API works** — blocked on the above
- [ ] **Mobile view checked on a real device** — the layout is responsive by
      construction (off-canvas navigation under 1024px, `overflow-x-auto` on the
      table) but has not been exercised on hardware

## Security

- [x] Synthetic data only — every record generated by `lib/data/generate.ts`
- [x] No real credentials anywhere in the repository
- [x] `.env*` ignored by Git — scaffold default, verified in `.gitignore`
- [x] Local database file ignored by Git — `/data/*.db` added
- [x] Server secrets remain server-side — there are none; nothing is exposed
      through a `NEXT_PUBLIC_` variable
- [x] All SQL uses bound parameters; only allowlisted identifiers reach SQL text
- [x] `LIKE` wildcards escaped — a search for `100%` does not match everything
- [x] CSV fields fully quoted, neutralising spreadsheet formula injection
- [x] Destructive endpoint guarded by environment and returns 404, not 403
- [ ] Database permissions / row-level security reviewed — **not applicable** to
      local SQLite; mandatory when moving to Supabase, see `lib/db/README.md`
- [ ] Authentication, authorization, rate limiting, audit logging — **absent by
      design** in V1. Recorded as open gaps in SECURITY-CHECKLIST.md, not oversights

## Not covered

Stated plainly rather than left to be assumed:

- No automated test suite. Every result above was produced by hand with `curl` and
  browser instrumentation. A regression can therefore reappear silently — an
  automated suite is the first thing V2 should gain.
- Responsive chart re-measurement is unverified; see DEBUG-REPORT.md §7.
- No load or concurrency testing.
- No accessibility audit with a screen reader. Keyboard access, focus rings,
  `aria-sort`, `aria-current`, `role="dialog"` and Escape-to-close were built in and
  exercised by keyboard, but no assistive technology was used.
- No cross-browser testing; verified in one Chromium-based browser only.
