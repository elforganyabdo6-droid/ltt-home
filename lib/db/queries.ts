/**
 * All SQL for the dashboard.
 *
 * Injection boundary: request values are only ever *bound* as `?` parameters.
 * The only strings concatenated into SQL text are taken from fixed maps in
 * `lib/validation.ts` (sort columns, group-by columns) or from this file's own
 * constants — never from a request.
 */

import { CHURN_FACTORS, CHURN_FACTOR_LABELS, TENURE_BANDS } from "../taxonomy";
import { normaliseFactors } from "../model";
import type {
  BreakdownRow,
  ChurnPrediction,
  Customer,
  CustomerWithPrediction,
  FactorContributions,
  FactorRow,
  Kpis,
  MonthlyChurnActual,
  Paginated,
} from "../types";
import type {
  BreakdownTarget,
  CustomerFilters,
  Pagination,
  SortSpec,
} from "../validation";
import { getDb } from "./index";
import {
  ACCOUNT_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  PACKAGE_LABELS,
  REGION_LABELS,
  RISK_LEVEL_LABELS,
  SUBSCRIPTION_TYPE_LABELS,
  TENURE_BAND_LABELS,
  USAGE_LEVEL_LABELS,
  type TenureBand,
} from "../taxonomy";

const JOIN = `FROM customers c JOIN churn_predictions p ON p.customer_id = c.id`;

/**
 * Assert the shape of a SQL result row.
 *
 * `node:sqlite` types every row as `Record<string, SQLOutputValue>` because it
 * cannot know a query's projection. These two helpers mark the one place where a
 * runtime shape is taken on trust: the SELECT list and the row interface beside
 * it must be kept in step by hand, and changing one without the other is exactly
 * the bug this makes visible rather than hides.
 */
function asRow<T>(row: unknown): T {
  return row as T;
}

function asRows<T>(rows: unknown): T[] {
  return rows as T[];
}

/** Tenure band predicates. Fixed SQL — no request value reaches the text. */
const TENURE_SQL: Record<TenureBand, string> = {
  "0-6": "c.tenure_months < 6",
  "6-12": "c.tenure_months >= 6 AND c.tenure_months < 12",
  "12-24": "c.tenure_months >= 12 AND c.tenure_months < 24",
  "24+": "c.tenure_months >= 24",
};

/** Band expression reused by the tenure breakdown so bands cannot drift apart. */
const TENURE_BAND_EXPR = `CASE
  WHEN c.tenure_months < 6  THEN '0-6'
  WHEN c.tenure_months < 12 THEN '6-12'
  WHEN c.tenure_months < 24 THEN '12-24'
  ELSE '24+'
END`;

type BindValue = string | number;

interface WhereClause {
  sql: string;
  params: BindValue[];
}

/**
 * Escape LIKE wildcards in user input so a search for "100%" does not match
 * everything. Paired with `ESCAPE '\'` on the LIKE.
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function buildWhere(filters: CustomerFilters): WhereClause {
  const conditions: string[] = [];
  const params: BindValue[] = [];

  if (filters.customerType) {
    conditions.push("c.customer_type = ?");
    params.push(filters.customerType);
  }
  if (filters.subscriptionType) {
    conditions.push("c.subscription_type = ?");
    params.push(filters.subscriptionType);
  }
  if (filters.package) {
    conditions.push("c.package = ?");
    params.push(filters.package);
  }
  if (filters.region) {
    conditions.push("c.region = ?");
    params.push(filters.region);
  }
  if (filters.usage) {
    conditions.push("c.data_usage_level = ?");
    params.push(filters.usage);
  }
  if (filters.status) {
    conditions.push("c.status = ?");
    params.push(filters.status);
  }
  if (filters.risk) {
    conditions.push("p.risk_level = ?");
    params.push(filters.risk);
  }
  if (filters.atRisk) {
    conditions.push("p.risk_level <> 'low'");
  }
  if (filters.tenure) {
    conditions.push(`(${TENURE_SQL[filters.tenure]})`);
  }
  if (filters.q) {
    conditions.push(`(c.id LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')`);
    const pattern = `%${escapeLike(filters.q)}%`;
    params.push(pattern, pattern);
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

/* ------------------------------------------------------------------ KPIs -- */

interface KpiRow {
  totalCustomers: number;
  atRiskCustomers: number | null;
  highRiskCustomers: number | null;
  predictedChurnRatePct: number | null;
  averageTenureMonths: number | null;
  revenueAtRiskLyd: number | null;
  totalMonthlyRevenueLyd: number | null;
  averageConfidencePct: number | null;
}

export function getKpis(filters: CustomerFilters): Kpis {
  const where = buildWhere(filters);

  const row = asRow<KpiRow>(
    getDb()
      .prepare(
        `SELECT
         COUNT(*)                                                              AS totalCustomers,
         SUM(CASE WHEN p.risk_level <> 'low' THEN 1 ELSE 0 END)                AS atRiskCustomers,
         SUM(CASE WHEN p.risk_level =  'high' THEN 1 ELSE 0 END)               AS highRiskCustomers,
         AVG(p.churn_probability)                                              AS predictedChurnRatePct,
         AVG(c.tenure_months)                                                  AS averageTenureMonths,
         SUM(CASE WHEN p.risk_level <> 'low' THEN c.monthly_revenue_lyd ELSE 0 END) AS revenueAtRiskLyd,
         SUM(c.monthly_revenue_lyd)                                            AS totalMonthlyRevenueLyd,
         AVG(p.confidence)                                                     AS averageConfidencePct
       ${JOIN}
       ${where.sql}`,
      )
      .get(...where.params),
  );

  // Aggregates are NULL over an empty set — a filter combination with no matches
  // is normal, so coalesce rather than treating it as an error.
  return {
    totalCustomers: row.totalCustomers ?? 0,
    atRiskCustomers: row.atRiskCustomers ?? 0,
    highRiskCustomers: row.highRiskCustomers ?? 0,
    predictedChurnRatePct: round1(row.predictedChurnRatePct ?? 0),
    averageTenureMonths: round1(row.averageTenureMonths ?? 0),
    revenueAtRiskLyd: Math.round(row.revenueAtRiskLyd ?? 0),
    totalMonthlyRevenueLyd: Math.round(row.totalMonthlyRevenueLyd ?? 0),
    averageConfidencePct: round1(row.averageConfidencePct ?? 0),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/* ------------------------------------------------------- customer listing -- */

interface CustomerJoinRow {
  id: string;
  name: string;
  customer_type: string;
  subscription_type: string;
  package: string;
  region: string;
  subscription_start: string;
  tenure_months: number;
  monthly_revenue_lyd: number;
  data_usage_level: string;
  usage_change_pct: number;
  complaints_count: number;
  coverage_issue: number;
  payment_delays: number;
  days_since_interaction: number;
  package_expiry_days: number;
  status: string;
  churn_status: string;
  churn_probability: number;
  risk_level: string;
  top_factor: string;
  recommended_action: string;
  factors_json: string;
  confidence: number;
  model_version: string;
  predicted_at: string;
}

const SELECT_COLUMNS = `
  c.id, c.name, c.customer_type, c.subscription_type, c.package, c.region,
  c.subscription_start, c.tenure_months, c.monthly_revenue_lyd,
  c.data_usage_level, c.usage_change_pct, c.complaints_count, c.coverage_issue,
  c.payment_delays, c.days_since_interaction, c.package_expiry_days, c.status,
  c.churn_status,
  p.churn_probability, p.risk_level, p.top_factor, p.recommended_action,
  p.factors_json, p.confidence, p.model_version, p.predicted_at`;

function mapRow(row: CustomerJoinRow): CustomerWithPrediction {
  const customer: Customer = {
    id: row.id,
    name: row.name,
    customerType: row.customer_type as Customer["customerType"],
    subscriptionType: row.subscription_type as Customer["subscriptionType"],
    package: row.package as Customer["package"],
    region: row.region as Customer["region"],
    subscriptionStart: row.subscription_start,
    tenureMonths: row.tenure_months,
    monthlyRevenueLyd: row.monthly_revenue_lyd,
    dataUsageLevel: row.data_usage_level as Customer["dataUsageLevel"],
    usageChangePct: row.usage_change_pct,
    complaintsCount: row.complaints_count,
    // SQLite has no boolean type; the column stores 0/1.
    coverageIssue: row.coverage_issue === 1,
    paymentDelays: row.payment_delays,
    daysSinceInteraction: row.days_since_interaction,
    packageExpiryDays: row.package_expiry_days,
    status: row.status as Customer["status"],
    churnStatus: row.churn_status as Customer["churnStatus"],
  };

  const prediction: ChurnPrediction = {
    customerId: row.id,
    churnProbability: row.churn_probability,
    riskLevel: row.risk_level as ChurnPrediction["riskLevel"],
    topFactor: row.top_factor as ChurnPrediction["topFactor"],
    recommendedAction:
      row.recommended_action as ChurnPrediction["recommendedAction"],
    factors: JSON.parse(row.factors_json) as FactorContributions,
    confidence: row.confidence,
    modelVersion: row.model_version,
    predictedAt: row.predicted_at,
  };

  return { ...customer, prediction };
}

export function listCustomers(
  filters: CustomerFilters,
  sort: SortSpec,
  pagination: Pagination,
): Paginated<CustomerWithPrediction> {
  const db = getDb();
  const where = buildWhere(filters);

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total ${JOIN} ${where.sql}`)
    .get(...where.params) as { total: number };

  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  // Clamp rather than return an empty page: narrowing a filter while on page 7
  // is normal and should land the user on the last real page.
  const page = Math.min(pagination.page, totalPages);
  const offset = (page - 1) * pagination.pageSize;

  // sort.column and sort.direction come from allowlist maps, never the request.
  const rows = asRows<CustomerJoinRow>(
    db
      .prepare(
        `SELECT ${SELECT_COLUMNS}
         ${JOIN}
         ${where.sql}
         ORDER BY ${sort.column} ${sort.direction}, c.id ASC
         LIMIT ? OFFSET ?`,
      )
      .all(...where.params, pagination.pageSize, offset),
  );

  return {
    rows: rows.map(mapRow),
    total,
    page,
    pageSize: pagination.pageSize,
    totalPages,
  };
}

export function getCustomerById(id: string): CustomerWithPrediction | null {
  const row = getDb()
    .prepare(`SELECT ${SELECT_COLUMNS} ${JOIN} WHERE c.id = ?`)
    .get(id) as CustomerJoinRow | undefined;

  return row ? mapRow(row) : null;
}

/* ------------------------------------------------------- historical churn -- */

/**
 * Measured monthly churn. No filters apply — these are recorded aggregates, not
 * per-subscriber rows, so they cannot be sliced by package or region.
 */
export function getChurnTrend(): MonthlyChurnActual[] {
  const rows = getDb()
    .prepare(
      `SELECT month, customers_start, customers_churned, churn_rate_pct
       FROM monthly_churn_actuals
       ORDER BY month ASC`,
    )
    .all() as {
    month: string;
    customers_start: number;
    customers_churned: number;
    churn_rate_pct: number;
  }[];

  return rows.map((r) => ({
    month: r.month,
    customersStart: r.customers_start,
    customersChurned: r.customers_churned,
    churnRatePct: r.churn_rate_pct,
  }));
}

/* --------------------------------------------------------- factor analysis -- */

export function getFactorContributions(filters: CustomerFilters): FactorRow[] {
  const where = buildWhere(filters);

  // Factor names come from CHURN_FACTORS, our own constant — safe to place in
  // SQL text. json_extract keeps the summation in the database.
  const sumSelect = CHURN_FACTORS.map(
    (factor) =>
      `SUM(json_extract(p.factors_json, '$.${factor}')) AS sum_${factor}`,
  ).join(",\n         ");

  const dominantSelect = CHURN_FACTORS.map(
    (factor) =>
      `SUM(CASE WHEN p.top_factor = '${factor}' THEN 1 ELSE 0 END) AS dom_${factor}`,
  ).join(",\n         ");

  const row = getDb()
    .prepare(`SELECT ${sumSelect}, ${dominantSelect} ${JOIN} ${where.sql}`)
    .get(...where.params) as Record<string, number | null>;

  const totals = Object.fromEntries(
    CHURN_FACTORS.map((f) => [f, row[`sum_${f}`] ?? 0]),
  ) as FactorContributions;

  const shares = normaliseFactors(totals);

  return CHURN_FACTORS.map((factor) => ({
    factor,
    label: CHURN_FACTOR_LABELS[factor],
    contributionPct: round1(shares[factor]),
    dominantForCount: row[`dom_${factor}`] ?? 0,
  })).sort((a, b) => b.contributionPct - a.contributionPct);
}

/* -------------------------------------------------------------- breakdown -- */

const BREAKDOWN_LABELS: Record<string, Record<string, string>> = {
  package: PACKAGE_LABELS,
  region: REGION_LABELS,
  subscriptionType: SUBSCRIPTION_TYPE_LABELS,
  customerType: CUSTOMER_TYPE_LABELS,
  usage: USAGE_LEVEL_LABELS,
  status: ACCOUNT_STATUS_LABELS,
  tenure: TENURE_BAND_LABELS,
};

export function getBreakdown(
  target: BreakdownTarget,
  column: string | null,
  filters: CustomerFilters,
): BreakdownRow[] {
  const where = buildWhere(filters);
  // Either a fixed band expression or an allowlisted column — never raw input.
  const groupExpr = target === "tenure" ? TENURE_BAND_EXPR : column!;

  const rows = getDb()
    .prepare(
      `SELECT
         ${groupExpr}                                                          AS key,
         COUNT(*)                                                              AS customerCount,
         AVG(p.churn_probability)                                              AS averageProbability,
         SUM(CASE WHEN p.risk_level <> 'low' THEN 1 ELSE 0 END)                AS atRiskCount,
         SUM(CASE WHEN p.risk_level <> 'low' THEN c.monthly_revenue_lyd ELSE 0 END) AS revenueAtRiskLyd
       ${JOIN}
       ${where.sql}
       GROUP BY ${groupExpr}`,
    )
    .all(...where.params) as {
    key: string;
    customerCount: number;
    averageProbability: number | null;
    atRiskCount: number | null;
    revenueAtRiskLyd: number | null;
  }[];

  const labels = BREAKDOWN_LABELS[target] ?? {};

  const mapped: BreakdownRow[] = rows.map((r) => ({
    key: r.key,
    label: labels[r.key] ?? r.key,
    averageProbability: round1(r.averageProbability ?? 0),
    customerCount: r.customerCount,
    atRiskCount: r.atRiskCount ?? 0,
    revenueAtRiskLyd: Math.round(r.revenueAtRiskLyd ?? 0),
  }));

  // Tenure bands are ordinal — SQL returned them grouped, not ordered.
  if (target === "tenure") {
    const order = new Map(TENURE_BANDS.map((band, index) => [band, index]));
    mapped.sort(
      (a, b) => (order.get(a.key as TenureBand) ?? 0) - (order.get(b.key as TenureBand) ?? 0),
    );
    return mapped;
  }

  return mapped.sort((a, b) => b.averageProbability - a.averageProbability);
}

/* ----------------------------------------------------------------- export -- */

/** Every matching row, unpaginated — for CSV export only. */
export function listAllForExport(
  filters: CustomerFilters,
  sort: SortSpec,
): CustomerWithPrediction[] {
  const where = buildWhere(filters);
  const rows = asRows<CustomerJoinRow>(
    getDb()
      .prepare(
        `SELECT ${SELECT_COLUMNS}
         ${JOIN}
         ${where.sql}
         ORDER BY ${sort.column} ${sort.direction}, c.id ASC`,
      )
      .all(...where.params),
  );

  return rows.map(mapRow);
}

/* ------------------------------------------------------ risk distribution -- */

export interface RiskDistributionRow {
  riskLevel: "low" | "medium" | "high";
  label: string;
  customerCount: number;
  revenueLyd: number;
}

/** Subscriber counts per risk band — the donut, and the calibration check. */
export function getRiskDistribution(
  filters: CustomerFilters,
): RiskDistributionRow[] {
  const where = buildWhere(filters);

  const rows = getDb()
    .prepare(
      `SELECT p.risk_level AS riskLevel,
              COUNT(*) AS customerCount,
              SUM(c.monthly_revenue_lyd) AS revenueLyd
       ${JOIN}
       ${where.sql}
       GROUP BY p.risk_level`,
    )
    .all(...where.params) as {
    riskLevel: "low" | "medium" | "high";
    customerCount: number;
    revenueLyd: number | null;
  }[];

  const byLevel = new Map(rows.map((r) => [r.riskLevel, r]));

  // Always return all three bands, in order, so the donut legend is stable even
  // when a filter empties one band.
  return (["low", "medium", "high"] as const).map((level) => ({
    riskLevel: level,
    label: RISK_LEVEL_LABELS[level],
    customerCount: byLevel.get(level)?.customerCount ?? 0,
    revenueLyd: Math.round(byLevel.get(level)?.revenueLyd ?? 0),
  }));
}

/** Row count, used by the smoke test to prove the seed and persistence. */
export function countCustomers(): number {
  const { total } = getDb()
    .prepare("SELECT COUNT(*) AS total FROM customers")
    .get() as { total: number };
  return total;
}
