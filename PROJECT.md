# PROJECT

This file is the source of truth for this project. Read it before implementing
changes. If a change contradicts this file, update this file in the same commit.

## Purpose

Give LTT retention staff a ranked, explained list of subscribers likely to leave,
and give management a churn rate and revenue-at-risk view built on the same data.

## Users

| User | Needs |
|---|---|
| Retention officer (primary) | Ranked at-risk list, reason, recommended action |
| Management | Churn rate trend, revenue at risk, high-risk count |
| Marketing | Which package / region / subscription segments are churning |
| Data analyst | Factor contribution, model confidence |

## Business Problem

Churn is currently detected only after disconnection, via manual spreadsheet
joins across billing, complaints, and usage exports. There is no per-subscriber
list, no reason attached, and no repeatable process. See PROJECT-SCOPE.md.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript |
| Styling | Tailwind CSS v4, RTL, Cairo (self-hosted via next/font) |
| Backend | Next.js Route Handlers (`app/api/**/route.ts`) |
| Database | SQLite via `node:sqlite` (bundled with Node 24) |
| Charts | Hand-built inline SVG components (no chart dependency) |
| Version control | Git |
| Deployment target | Vercel (requires Postgres/Supabase swap first — see README) |

Deviation from the skill's default stack, recorded deliberately: the skill
specifies Supabase PostgreSQL. Supabase requires creating an account and holding
project credentials, which is out of bounds for this build. SQLite behind a
repository interface gives real SQL, real persistence, and locally verifiable
tests today, and `lib/db/README.md` documents the Supabase swap as one module.

## Core Features

Five maximum, per the skill's Five-Feature Rule.

1. Executive churn overview — six live KPIs, actual monthly churn trend, risk
   distribution.
2. Churn prediction list — server-side filter / search / sort / paginate, with
   risk level and recommended action per subscriber.
3. Customer profile drill-down — attributes, churn probability, model confidence,
   factor contribution, recommended action.
4. Driver analysis — factor contribution ranking, breakdown by package, region,
   tenure band, usage level.
5. Report export — CSV and print/PDF for high-risk, reasons, revenue at risk.

## Non-Goals

1. A trained ML model. V1 ships a deterministic scoring function behind the
   `ChurnModel` interface in `lib/model/`.
2. Authentication, accounts, RBAC.
3. Live billing/CRM/OSS integration, GIS map tiles, SMS/campaign automation.

## Data Model

Three tables. The separation of `churn_predictions` (forward-looking, per
subscriber) from `monthly_churn_actuals` (historical, aggregate) is deliberate —
the UI must never present a prediction as measured history.

```sql
create table customers (
  id                     text primary key,
  name                   text    not null,
  customer_type          text    not null,  -- أفراد | شركات
  subscription_type      text    not null,  -- 4G | ADSL | VDSL | FWA | Fiber | Libya Phone
  package                text    not null,  -- الأساسية | الفضية | الذهبية | الماسية
  region                 text    not null,
  subscription_start     text    not null,  -- ISO date
  tenure_months          integer not null,
  monthly_revenue_lyd    real    not null,
  data_usage_level       text    not null,  -- منخفض | متوسط | مرتفع
  usage_change_pct       real    not null,  -- positive = decline
  complaints_count       integer not null,
  coverage_issue         integer not null,  -- 0 | 1
  payment_delays         integer not null,
  days_since_interaction integer not null,
  package_expiry_days    integer not null,
  status                 text    not null,  -- نشط | إيقاف مؤقت | قيد الإلغاء
  churn_status           text    not null   -- active | churned (ACTUAL)
);

create table churn_predictions (
  customer_id       text primary key references customers(id) on delete cascade,
  churn_probability real not null,          -- 0..100 (PREDICTED)
  risk_level        text not null,          -- low | medium | high
  top_factor        text not null,
  factors_json      text not null,          -- per-factor contribution
  confidence        real not null,          -- 0..100
  model_version     text not null,
  predicted_at      text not null
);

create table monthly_churn_actuals (
  month             text primary key,       -- YYYY-MM
  customers_start   integer not null,
  customers_churned integer not null,
  churn_rate_pct    real    not null        -- ACTUAL, measured
);
```

Risk bands: `low` 0–30, `medium` 31–60, `high` 61–100.

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/kpis` | Six aggregate KPIs for the current filter set |
| GET | `/api/customers` | Paginated prediction list: filter, search, sort |
| GET | `/api/customers/[id]` | One subscriber + prediction + factor breakdown |
| GET | `/api/analytics/churn-trend` | Actual monthly churn rate (historical) |
| GET | `/api/analytics/factors` | Factor contribution for the filter set |
| GET | `/api/analytics/breakdown` | Avg probability grouped by a dimension |
| GET | `/api/export` | CSV for high-risk / reasons / revenue-at-risk |

Shared filter query parameters: `customerType`, `subscriptionType`, `package`,
`region`, `tenure`, `usage`, `status`, `risk`, `q`.

## Security Rules

1. Synthetic data only. No real subscriber data, MSISDNs, national IDs, payment
   details, CDRs, internal hostnames, or production credentials — ever, including
   in commits, screenshots, README examples, and AI prompts.
2. Validate every query parameter server-side against an allowlist. Never
   interpolate a user value into SQL — bound parameters only.
3. Sort keys and report names come from a fixed allowlist, never from raw input.
4. Errors return a useful message and no stack trace, SQL, or file path.
5. No secrets in source. `.env*` is gitignored; `.env.example` holds names only.
6. A local training build is not production-approved. See SECURITY-CHECKLIST.md.

## UI Rules

1. Arabic RTL interface (`<html lang="ar" dir="rtl">`), Cairo typeface.
2. Keep technical terms readable in Latin script: Churn, Customer ID, AUC, CSV.
3. Predicted values must be visibly labelled as predictions, and historical
   values as actuals. Never present one as the other.
4. Show model confidence wherever a probability is shown.
5. Every KPI and chart responds to the active filters.
6. The user can drill from an aggregate down to an individual subscriber.
7. Light and dark themes both defined at token level; no colour declared only
   inside a media query or theme block.
8. Usable on mobile: off-canvas navigation, no horizontal page scroll.
9. Executive-presentation quality — no placeholder text, no lorem, no debug UI.

## Coding Rules

1. One logical change at a time; Git checkpoint before risky changes.
2. Server-side validation lives in `lib/validation.ts` and is shared by routes.
3. Database access only through `lib/db/`; no SQL in components or routes.
4. The scoring function lives only in `lib/model/`; swapping it must not touch UI.
5. Components stay focused; no component both fetches and renders a whole page.
6. No new dependency where the platform or an existing one suffices.
7. Do not claim RUN / TESTED / VERIFIED without evidence. See AI-RULES.md.

## Acceptance Criteria

- [ ] `npm run build` succeeds
- [ ] `npm run lint` succeeds
- [ ] `/` renders six KPIs, churn trend, and risk distribution
- [ ] Changing any filter recomputes every KPI and chart
- [ ] Prediction table filters, searches, sorts, paginates server-side
- [ ] Clicking a row opens that subscriber's profile with factors and an action
- [ ] Predicted vs actual are visibly distinguished
- [ ] Model confidence is shown with every probability
- [ ] Invalid filter value → 400 with a useful message
- [ ] Invalid sort key → 400
- [ ] Unknown customer ID → 404
- [ ] Unknown report name → 400
- [ ] Data survives a server restart
- [ ] Arabic RTL correct; mobile usable; no console errors

## Deployment

Not deployed. V1 is a locally verified build.

Before Vercel: replace SQLite with Supabase PostgreSQL (`lib/db/` only —
serverless filesystems are read-only, so SQLite cannot persist there), add
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel, and
re-run TEST-CHECKLIST.md against the deployed URL.

## Current Status

See STATUS.md for the per-item GENERATED / RUN / TESTED / VERIFIED state.
