# DEBUG REPORT

Defects found while building this project, each with the evidence that proved it
and the retest that closed it. Recorded in the skill's SYMPTOM → EVIDENCE → LAYER
→ HYPOTHESIS → TEST → FIX → RETEST form.

Six defects and one non-defect. The last entry is included on purpose: an
investigation that concluded the code was fine is a result, and "fixing" it would
have been the actual mistake.

---

## 1. Almost the entire subscriber base scored as high risk

**Symptom** — The first `/api/kpis` response reported 68.1% average churn
probability, with 556 of 640 subscribers at risk and 422 high risk.

**Expected behaviour** — A broadband base should sit mostly in the low band, with
a small high-risk tail that is short enough to act on.

**Actual behaviour** — 87% of the base flagged at risk; 66% high risk.

**Evidence**

```json
{"totalCustomers":640,"atRiskCustomers":556,"highRiskCustomers":422,
 "predictedChurnRatePct":68.1}
```

**Suspected layer** — Backend, specifically the scoring function. Not the database:
the row count was right and the filters worked.

**Hypothesis** — The intercept (`-2.1`) was too weak against the sum of the
positive terms. In particular `daysSinceInteraction` is uniform over 1–240 with a
coefficient of `0.011`, contributing about `+1.32` on average — which cancels most
of the intercept before any real risk factor applies.

**Test performed** — Added `/api/analytics/risk-distribution` (needed by the donut
anyway) and measured the low/medium/high split directly, rather than reasoning
about coefficients.

**Root cause** — Miscalibration. Every positive term was tuned in isolation and
their sum was never measured against the generated population.

**Fix** — Named the intercept as `INTERCEPT`, documented that it governs the whole
distribution, and re-weighted: intercept `-3.75`, `daysSinceInteraction` to
`0.006`, usage decline to `0.022`, coverage to `0.9`, complaints scaled on `/8`.
Two measured iterations, not guesses.

**Retest** — Reseeded and re-measured:

| Band | Before | After |
|---|---|---|
| low | 13.1% | **69.1%** |
| medium | 20.9% | **21.7%** |
| high | 65.9% | **9.2%** |

Average probability 24.6%, average confidence 77.3%. The high-risk list is now 59
names — an actionable call list rather than a re-labelling of the customer base.

**Result** — PASSED

**Lesson** — The distribution was a measurable property the whole time. Two
minutes of measurement beat any amount of reasoning about the weights.

---

## 2. `node:sqlite` had no type declarations

**Symptom** — `tsc --noEmit` failed: `TS2307: Cannot find module 'node:sqlite'`.

**Evidence** — `lib/db/index.ts(9,30): error TS2307`.

**Suspected layer** — Code / dependencies.

**Hypothesis** — `create-next-app` pinned `@types/node@^20`, but the runtime is
Node 24 and `node:sqlite` did not exist in Node 20.

**Test performed** — Confirmed the runtime API works at all before blaming types:
a scratch script exercised `DatabaseSync`, `prepare().all()/.get()/.run()`, and
both positional and named binding under Node 24.19. All worked.

**Root cause** — Type definitions describing an older Node than the one in use.

**Fix** — `npm install --save-dev @types/node@^24`, plus
`"engines": { "node": ">=22.5.0" }` so the requirement is declared rather than
implied.

**Retest** — `npm run typecheck` clean.

**Result** — PASSED

---

## 3. Synchronous `setState` inside effects, and a real race behind it

**Symptom** — `npm run lint` failed with five errors, three of them
`react-hooks/set-state-in-effect` in `Dashboard.tsx`.

**Evidence**

```text
components/Dashboard.tsx
  125:5  error  Calling setState synchronously within an effect can trigger cascading renders
  130:5  error  Calling setState synchronously within an effect can trigger cascading renders
  171:5  error  Calling setState synchronously within an effect can trigger cascading renders
components/CustomerDrawer.tsx
   56:5  error  Calling setState synchronously within an effect can trigger cascading renders
```

**Suspected layer** — Frontend.

**Hypothesis** — Each fetch effect began by clearing state
(`setLoading(true); setError(null)`). Beyond the extra render pass the rule warns
about, this pattern has a worse consequence: nothing ties a response to the
request that produced it, so a slow reply for a filter set the user has already
moved on from can overwrite the current data.

**Test performed** — Traced the ordering by hand: filter A dispatches, filter B
dispatches, A resolves last, A's rows are committed. The `cancelled` flag guards
unmount, not supersession.

**Root cause** — Loading and error were treated as state to be synchronised
rather than as facts derivable from "which request do I have an answer for".

**Fix** — Results are now stored tagged with the request key that produced them
(`{ key, data }`), and loading/error are derived by comparing that tag with the
current key. No state is set before a fetch. Same change in `CustomerDrawer`,
keyed by customer id.

**Retest** — `npm run lint` clean; `npm run typecheck` clean. In the browser,
filtering to Tripoli and back gave 640 → 181 → 640 with no stale frame.

**Result** — PASSED

**Lesson** — The lint rule was pointing at a correctness bug, not a style
preference. Suppressing it would have hidden the race.

---

## 4. At-risk view reported a total that did not match its rows

**Symptom** — The at-risk view fetched every risk level, then dropped low-risk
rows in the client. The footer showed the unfiltered total.

**Evidence** — The code carried its own admission:

```ts
// The at-risk view has no single-value filter for "medium or high", so
// the slice is applied here rather than misreporting the total.
```

The comment was wrong: filtering after the fact *is* what misreports the total,
and it also breaks pagination — a page of ten could render as three.

**Suspected layer** — API contract. The `risk` parameter takes one band, but "at
risk" spans two.

**Hypothesis** — The filter belonged in SQL, not in the component.

**Fix** — Added an `atRisk` boolean parameter, validated as strictly `true` or
`false` (a typo must not read as false), applied in `buildWhere` as
`p.risk_level <> 'low'`. Removed the client-side filtering.

**Retest** — In the browser, the footer read `عرض 10 من 198 عميل`;
`/api/customers?atRisk=true` reported `total: 198`; `/api/kpis` reported
`atRiskCustomers: 198`. All three agree, and page one contained no low-risk row.

**Result** — PASSED

---

## 5. The database could not exist on a serverless host

**Symptom** — Found before deploying, by reading the target's constraints rather
than by watching it fail.

**Expected behaviour** — The deployed app serves data.

**Actual behaviour (predicted)** — Every API route fails at runtime. The app
builds and the page shell renders, so the failure appears only when data is
requested.

**Suspected layer** — Deployment / runtime environment. The skill's layer guide
calls this "works locally only → environment/deployment/runtime".

**Hypothesis** — Two independent faults:

1. The database was created at `data/churn.db`. Serverless filesystems are
   read-only, so `mkdirSync` and the file creation both fail.
2. The schema was read with `readFileSync` from `lib/db/schema.sql`. No module
   imports a `.sql` file, so a bundler has no reason to include it and the read
   fails in production while working in development.

**Test performed** — Built for production and ran it with `VERCEL=1` set, which is
what the code uses to detect a serverless environment.

**Fix**

1. The database is in-memory when a serverless platform is detected, and
   file-backed locally where the labs need observable persistence. Safe only
   because the dataset is deterministic — documented in `lib/db/README.md` as a
   load-bearing property, not a coincidence.
2. The DDL moved into `lib/db/schema.ts` as a module constant, so it is bundled.

**Retest** — Production build, `VERCEL=1`, port 3100:

| Check | Result |
|---|---|
| `GET /` | 200, `lang="ar" dir="rtl"` |
| `GET /api/kpis` | 200, 640 customers — identical to the file-backed run |
| `GET /api/customers/LTT-100017` | 200 |
| `GET /api/export?report=reasons` | 200, UTF-8 BOM present |
| `GET /api/kpis?region=atlantis` | 400 |
| `POST /api/dev/reseed` | **404** — correctly absent outside development |

**Result** — PASSED

---

## 6. `npm run db:reset` failed while the dev server was running

**Symptom** — `EPERM, Permission denied: …\data`.

**Evidence** — `Error: EPERM, Permission denied` from `rmSync`, exit code 1.

**Suspected layer** — Local tooling, not application code.

**Root cause** — The dev server holds an open handle on the SQLite file, and
Windows refuses to delete a directory containing an open file. Not a bug in the
script; a bug in the instruction to use it.

**Fix** — Two parts. `POST /api/dev/reseed` truncates and reseeds through the live
connection, so recalibration needs no restart; and the README states plainly that
`db:reset` requires stopping the server first.

**Retest** — `POST /api/dev/reseed` returned `{"reseeded":true,"customers":640}`
with the server running, and 404 in production.

**Result** — PASSED

---

## 7. NOT A DEFECT — charts appeared not to resize

**Symptom** — Chart `viewBox` widths stayed at 545 / 441 / 940 while their
containers measured 642, then 860, then 618 as the viewport changed. The SVGs were
being scaled by roughly 18%, which drifts label typography between panels.

**Suspected layer** — Frontend: the `useChartWidth` ResizeObserver hook.

**Hypothesis** — The observer was watching a detached node, or the effect captured
a stale element.

**Test performed** — Before changing the hook, attached an independent
ResizeObserver to the same element from the console and resized the viewport:

```json
{"myRoFired": 0, "testElWidth": 618, "currentViewBoxes": ["545","190","441","441","940"]}
```

A brand-new observer on a genuinely resizing element also fired zero times.

**Root cause** — Not the code. ResizeObserver delivery is tied to the rendering
loop, and this browser pane was not compositing frames — the same reason
screenshots timed out in the same session. The hook was never given a callback to
respond to.

**Fix** — None to the reported symptom, because there was nothing wrong. A
robustness improvement was made on its own merits: a `window.resize` listener and
a trailing `requestAnimationFrame` re-measure, so the chart stays correct where
the observer is throttled and where container width settles after first paint
(web-font metrics landing can change a grid track after mount). The state setter
now ignores no-op updates so the extra measure cannot loop.

**Retest** — Build, typecheck and lint clean. **Responsive re-measurement remains
unverified**: it cannot be observed in an environment that does not composite, so
it is recorded as TESTED-elsewhere-required in `STATUS.md` rather than claimed.

**Result** — NOT A DEFECT (hypothesis rejected by evidence)

**Lesson** — The instinct was to rewrite the hook. Ten seconds of instrumentation
showed the measurement apparatus was broken instead. Changing working code to
chase a phantom would have added risk and fixed nothing.
