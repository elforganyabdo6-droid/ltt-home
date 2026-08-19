# PROJECT SCOPE

PROJECT NAME:

LTT Customer Churn Prediction Dashboard — لوحة تحكم تنبؤ مغادرة العملاء

BUSINESS PROBLEM:

LTT has no single view showing which subscribers are about to leave. Churn is
discovered after the fact, from monthly disconnection reports, by which point the
subscriber is already gone. Nobody can answer "which subscribers should we call
this week, and why" without manually cross-referencing exports from billing, the
complaints log, and usage reports.

PRIMARY USER:

Customer Experience / Retention officer. Works a daily outreach list. Needs a
ranked list of at-risk subscribers, each with a reason and a recommended action.

SECONDARY USER:

- Management — monthly churn rate, revenue at risk, trend direction.
- Marketing — which segments (package, region, subscription type) to target.
- Data Analysts — factor contribution and model quality.

CURRENT PROCESS:

Monthly disconnection report is exported from billing. An analyst manually joins
it against a complaints spreadsheet and a usage export, builds a pivot table, and
emails a summary. Retention staff receive no per-subscriber list.

PROBLEM WITH CURRENT PROCESS:

- Backward looking: it counts subscribers who already left.
- Manual and slow: days of spreadsheet work per cycle, not repeatable.
- No per-subscriber action: management sees a percentage, staff get no call list.
- No reason attached: nobody knows whether a subscriber left over coverage,
  price, or a mishandled complaint.

DESIRED OUTCOME:

A retention officer opens one page and gets a ranked list of at-risk subscribers,
each with a churn probability, the factors driving it, and a recommended action.
Management sees churn rate and revenue at risk on the same data, in Arabic, on
desktop or mobile.

INPUT DATA:

Customer ID, customer type, subscription type, package, subscription start date,
tenure, monthly revenue, data usage level, usage change, complaints count,
coverage issue flag, payment delays, days since last interaction, package expiry,
account status, historical churn status. All synthetic in V1.

OUTPUT:

- Six live KPIs (total customers, at-risk, predicted churn rate, high-risk count,
  average tenure, monthly revenue at risk).
- Actual monthly churn rate trend (historical, clearly separated from prediction).
- Ranked churn-prediction table with risk level and recommended action.
- Per-customer profile with probability, model confidence, and factor breakdown.
- Driver analysis: factor contribution, and breakdown by package/region/tenure/usage.
- CSV and print/PDF exports.

MUST-HAVE FEATURES:

1. Executive churn overview — KPI cards, actual churn trend, risk distribution.
2. Churn prediction list — server-side filter, search, sort, paginate; risk level
   and recommended action per subscriber.
3. Customer profile drill-down — one subscriber: attributes, churn probability,
   model confidence, factor contribution, recommended action.
4. Driver analysis — factor contribution ranking and breakdowns by package,
   region, tenure band, and usage level.
5. Report export — CSV and print/PDF for high-risk list, churn reasons, and
   revenue at risk.

NOT IN V1:

1. A trained machine-learning model. V1 ships a documented, deterministic scoring
   function behind a `ChurnModel` interface. Training, serving, and drift
   monitoring are out of scope.
2. Authentication, user accounts, and role-based access control.
3. Live integration with billing / CRM / network OSS, GIS map tiles, and
   SMS/campaign automation.

DATA CLASSIFICATION:

Synthetic / training only. No real LTT subscriber data, MSISDNs, national IDs,
payment details, CDRs, internal hostnames, or production credentials are used or
permitted in this repository. See SECURITY-CHECKLIST.md.

EXTERNAL SYSTEMS REQUIRED:

None in V1. The data layer is SQLite (`node:sqlite`, bundled with Node 24) behind
a repository interface, so a later swap to Supabase PostgreSQL touches one module.

SUCCESS CRITERIA:

- `npm run build` and `npm run lint` succeed with no errors.
- All six KPIs recompute when any filter changes.
- Prediction table filters, searches, sorts, and paginates server-side.
- Clicking any row opens that subscriber's profile with factors and an action.
- Invalid API input is rejected server-side with 400 and a useful message;
  unknown customer returns 404.
- Data survives a server restart (proven, not assumed).
- Arabic RTL renders correctly; mobile layout usable; no console errors.

DEPLOYMENT TARGET:

Local verified build in V1. Vercel deployment requires swapping SQLite for
Supabase PostgreSQL first — serverless filesystems are read-only. Documented in
README.md, not yet done.

OWNER:

a.Frgani@ltt.ly
