/**
 * Server-side request validation.
 *
 * Every value arriving from a query string passes through here before it reaches
 * the database. Frontend controls are never treated as a validation layer — the
 * API is a public surface and must reject bad input on its own.
 *
 * Two rules hold throughout:
 *   1. Enum values are checked against an allowlist, never passed through.
 *   2. Anything that ends up inside SQL *text* (sort column, group-by column)
 *      comes from a fixed map in this file. Request values are only ever bound
 *      as parameters.
 */

import {
  ACCOUNT_STATUSES,
  CUSTOMER_TYPES,
  PACKAGES,
  REGIONS,
  RISK_LEVELS,
  SUBSCRIPTION_TYPES,
  TENURE_BANDS,
  USAGE_LEVELS,
  type AccountStatus,
  type CustomerType,
  type Package,
  type Region,
  type RiskLevel,
  type SubscriptionType,
  type TenureBand,
  type UsageLevel,
} from "./taxonomy";

export class ValidationError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface CustomerFilters {
  customerType?: CustomerType;
  subscriptionType?: SubscriptionType;
  package?: Package;
  region?: Region;
  tenure?: TenureBand;
  usage?: UsageLevel;
  status?: AccountStatus;
  risk?: RiskLevel;
  /**
   * Restrict to medium-or-high risk. A distinct flag rather than a `risk` value
   * because "at risk" spans two bands, and filtering the page client-side after
   * the fact would report a total that does not match the rows shown.
   */
  atRisk?: boolean;
  /** Free-text search over customer id and name. */
  q?: string;
}

/**
 * Read one optional enum parameter. `undefined` and the sentinel `"all"` both
 * mean "no filter" — `"all"` is what the UI selects send for an unset dropdown.
 */
function optionalEnum<T extends string>(
  params: URLSearchParams,
  field: string,
  allowed: readonly T[],
): T | undefined {
  const raw = params.get(field);
  if (raw === null || raw === "" || raw === "all") return undefined;

  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ValidationError(
      field,
      `قيمة غير صحيحة للحقل ${field}. القيم المسموح بها: ${allowed.join(", ")}`,
    );
  }
  return raw as T;
}

const MAX_SEARCH_LENGTH = 64;

function optionalSearch(params: URLSearchParams): string | undefined {
  const raw = params.get("q");
  if (raw === null) return undefined;

  const trimmed = raw.trim();
  if (trimmed === "") return undefined;

  if (trimmed.length > MAX_SEARCH_LENGTH) {
    throw new ValidationError(
      "q",
      `نص البحث طويل جدًا. الحد الأقصى ${MAX_SEARCH_LENGTH} حرفًا.`,
    );
  }
  return trimmed;
}

export function parseFilters(params: URLSearchParams): CustomerFilters {
  return {
    customerType: optionalEnum(params, "customerType", CUSTOMER_TYPES),
    subscriptionType: optionalEnum(params, "subscriptionType", SUBSCRIPTION_TYPES),
    package: optionalEnum(params, "package", PACKAGES),
    region: optionalEnum(params, "region", REGIONS),
    tenure: optionalEnum(params, "tenure", TENURE_BANDS),
    usage: optionalEnum(params, "usage", USAGE_LEVELS),
    status: optionalEnum(params, "status", ACCOUNT_STATUSES),
    risk: optionalEnum(params, "risk", RISK_LEVELS),
    atRisk: optionalBoolean(params, "atRisk"),
    q: optionalSearch(params),
  };
}

/** Accepts only "true"/"false" — a typo must not silently read as false. */
function optionalBoolean(
  params: URLSearchParams,
  field: string,
): boolean | undefined {
  const raw = params.get(field);
  if (raw === null || raw === "" || raw === "all") return undefined;
  if (raw !== "true" && raw !== "false") {
    throw new ValidationError(field, `الحقل ${field} يجب أن يكون true أو false.`);
  }
  return raw === "true";
}

export interface Pagination {
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Pagination is clamped rather than rejected: a page number past the end is a
 * normal consequence of narrowing a filter while on page 7, not a caller error.
 * Non-numeric input *is* an error, because it means a broken caller.
 */
export function parsePagination(params: URLSearchParams): Pagination {
  const page = parsePositiveInt(params, "page", 1);
  const pageSize = parsePositiveInt(params, "pageSize", DEFAULT_PAGE_SIZE);

  return {
    page: Math.max(1, page),
    pageSize: Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE),
  };
}

function parsePositiveInt(
  params: URLSearchParams,
  field: string,
  fallback: number,
): number {
  const raw = params.get(field);
  if (raw === null || raw === "") return fallback;

  // Reject "12abc", "1e5", "" and similar rather than letting Number() coerce.
  if (!/^-?\d+$/.test(raw)) {
    throw new ValidationError(field, `الحقل ${field} يجب أن يكون رقمًا صحيحًا.`);
  }
  return Number.parseInt(raw, 10);
}

/**
 * Sort keys the API accepts, mapped to the SQL expression each one means.
 *
 * This map is the injection boundary. The request supplies a *key*; only the
 * value from this map is ever concatenated into SQL. An unknown key is a 400,
 * never a query.
 */
const SORT_COLUMNS = {
  id: "c.id",
  name: "c.name",
  customerType: "c.customer_type",
  package: "c.package",
  region: "c.region",
  tenure: "c.tenure_months",
  usage: "c.data_usage_level",
  complaints: "c.complaints_count",
  lastInteraction: "c.days_since_interaction",
  revenue: "c.monthly_revenue_lyd",
  probability: "p.churn_probability",
  confidence: "p.confidence",
  risk: "p.churn_probability",
} as const;

export type SortKey = keyof typeof SORT_COLUMNS;

export const SORT_KEYS = Object.keys(SORT_COLUMNS) as SortKey[];

export interface SortSpec {
  key: SortKey;
  /** Safe to interpolate: comes from SORT_COLUMNS, not from the request. */
  column: string;
  direction: "ASC" | "DESC";
}

export function parseSort(
  params: URLSearchParams,
  defaultKey: SortKey = "probability",
): SortSpec {
  const rawKey = params.get("sort");
  const rawDir = params.get("dir");

  let key: SortKey = defaultKey;
  if (rawKey !== null && rawKey !== "") {
    if (!Object.prototype.hasOwnProperty.call(SORT_COLUMNS, rawKey)) {
      throw new ValidationError(
        "sort",
        `مفتاح ترتيب غير معروف. المفاتيح المسموح بها: ${SORT_KEYS.join(", ")}`,
      );
    }
    key = rawKey as SortKey;
  }

  let direction: "ASC" | "DESC" = "DESC";
  if (rawDir !== null && rawDir !== "") {
    const upper = rawDir.toUpperCase();
    if (upper !== "ASC" && upper !== "DESC") {
      throw new ValidationError("dir", "اتجاه الترتيب يجب أن يكون asc أو desc.");
    }
    direction = upper;
  }

  return { key, column: SORT_COLUMNS[key], direction };
}

/** Group-by dimensions, mapped to their SQL column. Same injection boundary. */
const BREAKDOWN_COLUMNS = {
  package: "c.package",
  region: "c.region",
  subscriptionType: "c.subscription_type",
  customerType: "c.customer_type",
  usage: "c.data_usage_level",
  status: "c.status",
} as const;

export type BreakdownDimension = keyof typeof BREAKDOWN_COLUMNS;

export const BREAKDOWN_DIMENSIONS = Object.keys(
  BREAKDOWN_COLUMNS,
) as BreakdownDimension[];

/** `tenure` is banded in SQL rather than grouped on a raw column. */
export type BreakdownTarget = BreakdownDimension | "tenure";

export function parseBreakdown(params: URLSearchParams): {
  dimension: BreakdownTarget;
  column: string | null;
} {
  const raw = params.get("by");
  if (raw === null || raw === "") {
    return { dimension: "package", column: BREAKDOWN_COLUMNS.package };
  }
  if (raw === "tenure") {
    return { dimension: "tenure", column: null };
  }
  if (!Object.prototype.hasOwnProperty.call(BREAKDOWN_COLUMNS, raw)) {
    throw new ValidationError(
      "by",
      `بُعد تجميع غير معروف. الأبعاد المسموح بها: ${[...BREAKDOWN_DIMENSIONS, "tenure"].join(", ")}`,
    );
  }
  const dimension = raw as BreakdownDimension;
  return { dimension, column: BREAKDOWN_COLUMNS[dimension] };
}

export const REPORT_NAMES = ["high-risk", "reasons", "revenue"] as const;
export type ReportName = (typeof REPORT_NAMES)[number];

export function parseReport(params: URLSearchParams): ReportName {
  const raw = params.get("report");
  if (raw === null || raw === "") {
    throw new ValidationError("report", "يجب تحديد اسم التقرير.");
  }
  if (!(REPORT_NAMES as readonly string[]).includes(raw)) {
    throw new ValidationError(
      "report",
      `تقرير غير معروف. التقارير المتاحة: ${REPORT_NAMES.join(", ")}`,
    );
  }
  return raw as ReportName;
}

/** Customer IDs are `LTT-` followed by digits. Anything else cannot exist. */
const CUSTOMER_ID_PATTERN = /^LTT-\d{4,10}$/;

export function assertValidCustomerId(id: string): void {
  if (!CUSTOMER_ID_PATTERN.test(id)) {
    throw new ValidationError("id", "صيغة رقم العميل غير صحيحة.");
  }
}
