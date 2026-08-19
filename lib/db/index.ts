/**
 * Database connection and seeding.
 *
 * SQLite via `node:sqlite` (bundled with Node 24 — no dependency to install).
 * All SQL in this project lives under `lib/db/`; route handlers and components
 * never contain SQL. See lib/db/README.md for the Supabase PostgreSQL swap.
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { DATASET_SEED, DATASET_SIZE } from "../constants";
import { generateCustomers, generateMonthlyChurnActuals } from "../data/generate";
import { churnModel } from "../model";

const DB_PATH = join(process.cwd(), "data", "churn.db");
const SCHEMA_PATH = join(process.cwd(), "lib", "db", "schema.sql");

/**
 * Next.js dev mode re-evaluates modules on hot reload. Caching the handle on
 * globalThis keeps one connection rather than leaking a file handle per reload.
 */
const globalForDb = globalThis as unknown as {
  __lttChurnDb?: DatabaseSync;
};

function openDatabase(): DatabaseSync {
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const db = new DatabaseSync(DB_PATH);

  // WAL improves concurrent reads; foreign keys are off by default in SQLite and
  // must be enabled per connection for ON DELETE CASCADE to apply.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(readFileSync(SCHEMA_PATH, "utf8"));
  seedIfEmpty(db);

  return db;
}

/**
 * Populate the database on first run only. Existing rows are left alone, which
 * is what makes persistence across a server restart observable.
 */
function seedIfEmpty(db: DatabaseSync): void {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM customers").get() as {
    count: number;
  };
  if (count > 0) return;

  seedDatabase(db);
}

/**
 * Delete everything and seed again, reusing the live connection.
 *
 * Needed because the running server holds the SQLite file open, so deleting
 * `data/churn.db` from another process fails on Windows. Recalibrating the model
 * requires regenerating predictions, so this has to be reachable without a
 * restart. Exposed only through a development-only route.
 */
export function reseedDatabase(): { customers: number } {
  const db = getDb();

  db.exec("BEGIN");
  try {
    // Ordered child-first; the FK is ON DELETE CASCADE but being explicit keeps
    // this correct if the constraint is ever relaxed.
    db.exec("DELETE FROM churn_predictions");
    db.exec("DELETE FROM customers");
    db.exec("DELETE FROM monthly_churn_actuals");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  seedDatabase(db);

  const { count } = db.prepare("SELECT COUNT(*) AS count FROM customers").get() as {
    count: number;
  };
  return { customers: count };
}

/** Generate and insert the full synthetic dataset. Assumes empty tables. */
function seedDatabase(db: DatabaseSync): void {
  const customers = generateCustomers(DATASET_SEED, DATASET_SIZE);
  const actuals = generateMonthlyChurnActuals();

  const insertCustomer = db.prepare(`
    INSERT INTO customers (
      id, name, customer_type, subscription_type, package, region,
      subscription_start, tenure_months, monthly_revenue_lyd, data_usage_level,
      usage_change_pct, complaints_count, coverage_issue, payment_delays,
      days_since_interaction, package_expiry_days, status, churn_status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const insertPrediction = db.prepare(`
    INSERT INTO churn_predictions (
      customer_id, churn_probability, risk_level, top_factor,
      recommended_action, factors_json, confidence, model_version, predicted_at
    ) VALUES (?,?,?,?,?,?,?,?,?)
  `);

  const insertActual = db.prepare(`
    INSERT INTO monthly_churn_actuals (
      month, customers_start, customers_churned, churn_rate_pct
    ) VALUES (?,?,?,?)
  `);

  // One transaction: a partial seed would leave the dashboard showing a
  // truncated dataset with no obvious sign anything went wrong.
  db.exec("BEGIN");
  try {
    for (const c of customers) {
      insertCustomer.run(
        c.id,
        c.name,
        c.customerType,
        c.subscriptionType,
        c.package,
        c.region,
        c.subscriptionStart,
        c.tenureMonths,
        c.monthlyRevenueLyd,
        c.dataUsageLevel,
        c.usageChangePct,
        c.complaintsCount,
        c.coverageIssue ? 1 : 0,
        c.paymentDelays,
        c.daysSinceInteraction,
        c.packageExpiryDays,
        c.status,
        c.churnStatus,
      );

      const p = churnModel.predict(c);
      insertPrediction.run(
        p.customerId,
        p.churnProbability,
        p.riskLevel,
        p.topFactor,
        p.recommendedAction,
        JSON.stringify(p.factors),
        p.confidence,
        p.modelVersion,
        p.predictedAt,
      );
    }

    for (const a of actuals) {
      insertActual.run(a.month, a.customersStart, a.customersChurned, a.churnRatePct);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__lttChurnDb) {
    globalForDb.__lttChurnDb = openDatabase();
  }
  return globalForDb.__lttChurnDb;
}
