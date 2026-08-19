/**
 * SQLite schema, as a module constant rather than a `.sql` file read at runtime.
 *
 * A `.sql` file is not reachable from any import, so a serverless bundler has no
 * reason to include it and `readFileSync` then fails in production with a missing
 * file. Keeping the DDL in a module guarantees it ships with the code.
 *
 * The PostgreSQL equivalent for the Supabase migration is in lib/db/README.md —
 * it is a genuinely different artifact (different types, different identity
 * syntax), not a copy of this one.
 *
 * Two things are deliberately kept apart:
 *   churn_predictions      forward-looking, per subscriber, produced by the model
 *   monthly_churn_actuals  measured history, aggregate, never predicted
 * The UI must never present one as the other.
 */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS customers (
  id                     TEXT    PRIMARY KEY,
  name                   TEXT    NOT NULL,
  customer_type          TEXT    NOT NULL,
  subscription_type      TEXT    NOT NULL,
  package                TEXT    NOT NULL,
  region                 TEXT    NOT NULL,
  subscription_start     TEXT    NOT NULL,
  tenure_months          INTEGER NOT NULL,
  monthly_revenue_lyd    REAL    NOT NULL,
  data_usage_level       TEXT    NOT NULL,
  usage_change_pct       REAL    NOT NULL,
  complaints_count       INTEGER NOT NULL,
  coverage_issue         INTEGER NOT NULL,
  payment_delays         INTEGER NOT NULL,
  days_since_interaction INTEGER NOT NULL,
  package_expiry_days    INTEGER NOT NULL,
  status                 TEXT    NOT NULL,
  churn_status           TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS churn_predictions (
  customer_id        TEXT    PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  churn_probability  REAL    NOT NULL,
  risk_level         TEXT    NOT NULL,
  top_factor         TEXT    NOT NULL,
  recommended_action TEXT    NOT NULL,
  factors_json       TEXT    NOT NULL,
  confidence         REAL    NOT NULL,
  model_version      TEXT    NOT NULL,
  predicted_at       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_churn_actuals (
  month             TEXT    PRIMARY KEY,
  customers_start   INTEGER NOT NULL,
  customers_churned INTEGER NOT NULL,
  churn_rate_pct    REAL    NOT NULL
);

-- Indexes on every column the dashboard filters or groups by. Without these the
-- filtered aggregate queries degrade to full scans on every KPI request.
CREATE INDEX IF NOT EXISTS idx_customers_region  ON customers(region);
CREATE INDEX IF NOT EXISTS idx_customers_package ON customers(package);
CREATE INDEX IF NOT EXISTS idx_customers_type    ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_subtype ON customers(subscription_type);
CREATE INDEX IF NOT EXISTS idx_customers_usage   ON customers(data_usage_level);
CREATE INDEX IF NOT EXISTS idx_customers_status  ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_tenure  ON customers(tenure_months);
CREATE INDEX IF NOT EXISTS idx_predictions_risk  ON churn_predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_prob  ON churn_predictions(churn_probability);
`;
