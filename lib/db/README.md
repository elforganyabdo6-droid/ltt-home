# Data layer

All SQL in this project lives in this folder. Route handlers and components never
contain SQL — they call functions from `queries.ts`.

## Files

| File | Purpose |
|---|---|
| `schema.ts` | The SQLite DDL, as a module constant |
| `index.ts` | Connection, location resolution, seeding, reseeding |
| `queries.ts` | Every query the dashboard runs |

## Why SQLite, and why the DDL is not a `.sql` file

`node:sqlite` ships inside Node 22.5+, so the database costs no dependency, no
container, and no account. That matters for a training project: a trainee clones,
runs `npm install`, and has a working database with real SQL in it.

The DDL lives in `schema.ts` rather than `schema.sql` because nothing imports a
`.sql` file, so a serverless bundler has no reason to include it — and
`readFileSync` then throws in production while working perfectly in development.
That failure mode is exactly the kind that gets discovered after deployment.

## Where the database lives

| Environment | Location | Why |
|---|---|---|
| Local development | `data/churn.db` | Persistence across restarts is observable, which Lab 4 needs |
| Serverless (Vercel, Lambda) | `:memory:` | Those filesystems are read-only; a file-backed database cannot be created |

Detected from `process.env.VERCEL` / `AWS_LAMBDA_FUNCTION_NAME`. Override with
`LTT_DB_MODE=file` or `LTT_DB_MODE=memory`.

An in-memory database is safe here only because the dataset is **deterministic**:
`DATASET_SEED` produces the same 640 subscribers every time, so every serverless
instance holds identical data and two requests hitting different instances cannot
disagree. **This property is load-bearing.** If the generator ever gains a real
random source, or the app ever needs to persist a user action, in-memory stops
being correct and a real database becomes mandatory.

## Injection boundary

Two rules, both enforced by construction rather than by review:

1. **Every request value is bound**, never interpolated. All user input reaches
   SQLite through `?` placeholders.
2. **Only allowlisted identifiers reach SQL text.** A sort column or group-by
   column cannot be expressed as a bound parameter, so those come from fixed maps
   in `lib/validation.ts` (`SORT_COLUMNS`, `BREAKDOWN_COLUMNS`). The request
   supplies a *key*; an unknown key is a 400, never a query.

Verified by test: `?sort=c.id;DROP+TABLE+customers` and `?region=' OR 1=1--` both
return 400 with the 640-row table intact afterwards.

`LIKE` wildcards in the search term are escaped (`escapeLike`) with
`ESCAPE '\'`, so searching for `100%` does not match every row.

## Migrating to Supabase PostgreSQL

The project scope names Supabase as the eventual store. Only this folder changes;
nothing above `queries.ts` knows what the database is.

Steps:

1. Create the Supabase project and run the DDL below in the SQL editor.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` locally and
   in Vercel. Never commit them — `.env*` is gitignored.
3. Replace the body of each function in `queries.ts` with the Supabase client
   equivalent, keeping the signatures and return types identical.
4. Enable row-level security and write policies. Do not "fix" an access error by
   making the table public.
5. Re-run `TEST-CHECKLIST.md` against the deployed URL, including the negative
   cases.

The PostgreSQL DDL differs from the SQLite one in real ways — genuine booleans, a
`jsonb` column, timestamps, and generated identity — so it is its own artifact
rather than a copy:

```sql
create table customers (
  id                     text primary key,
  name                   text        not null,
  customer_type          text        not null,
  subscription_type      text        not null,
  package                text        not null,
  region                 text        not null,
  subscription_start     date        not null,
  tenure_months          integer     not null,
  monthly_revenue_lyd    numeric(10,2) not null,
  data_usage_level       text        not null,
  usage_change_pct       numeric(6,2)  not null,
  complaints_count       integer     not null,
  coverage_issue         boolean     not null,
  payment_delays         integer     not null,
  days_since_interaction integer     not null,
  package_expiry_days    integer     not null,
  status                 text        not null,
  churn_status           text        not null,
  constraint customers_status_check
    check (status in ('active','suspended','pending_cancellation')),
  constraint customers_churn_status_check
    check (churn_status in ('active','churned'))
);

create table churn_predictions (
  customer_id        text primary key references customers(id) on delete cascade,
  churn_probability  numeric(5,2) not null check (churn_probability between 0 and 100),
  risk_level         text         not null check (risk_level in ('low','medium','high')),
  top_factor         text         not null,
  recommended_action text         not null,
  factors            jsonb        not null,
  confidence         numeric(5,2) not null check (confidence between 0 and 100),
  model_version      text         not null,
  predicted_at       timestamptz  not null default now()
);

create table monthly_churn_actuals (
  month             date    primary key,
  customers_start   integer not null,
  customers_churned integer not null,
  churn_rate_pct    numeric(5,2) not null
);

create index on customers (region);
create index on customers (package);
create index on customers (customer_type);
create index on customers (subscription_type);
create index on customers (data_usage_level);
create index on customers (status);
create index on customers (tenure_months);
create index on churn_predictions (risk_level);
create index on churn_predictions (churn_probability);
```

Two differences to carry into `queries.ts`:

- `coverage_issue` becomes a real boolean, so the `row.coverage_issue === 1`
  mapping in `mapRow` must become a direct assignment.
- `factors` becomes `jsonb`, so `json_extract(factors_json, '$.coverage')` becomes
  `(factors->>'coverage')::numeric`.
