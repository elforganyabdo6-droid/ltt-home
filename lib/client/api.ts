/**
 * Typed client for the dashboard's own API.
 *
 * The browser talks to the Route Handlers rather than reading the database
 * directly, so the API is genuinely exercised by the UI — and anything the UI can
 * do is reachable and testable with curl.
 */

import type {
  BreakdownRow,
  CustomerWithPrediction,
  FactorRow,
  Kpis,
  MonthlyChurnActual,
  Paginated,
} from "../types";
import type { RiskDistributionRow } from "../db/queries";
import type { BreakdownTarget, SortKey } from "../validation";

export interface DashboardFilters {
  customerType: string;
  subscriptionType: string;
  package: string;
  region: string;
  tenure: string;
  usage: string;
  status: string;
  risk: string;
  q: string;
}

export const EMPTY_FILTERS: DashboardFilters = {
  customerType: "all",
  subscriptionType: "all",
  package: "all",
  region: "all",
  tenure: "all",
  usage: "all",
  status: "all",
  risk: "all",
  q: "",
};

/** Drop unset values so the query string stays readable and cache-friendly. */
export function filtersToQuery(
  filters: Partial<DashboardFilters>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") params.set(key, String(value));
  }
  return params;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJson<T>(path: string, params?: URLSearchParams): Promise<T> {
  const query = params && [...params].length ? `?${params}` : "";
  const response = await fetch(`${path}${query}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    // The API always returns { error: { message, field? } }; fall back only if
    // something upstream produced a non-JSON error page.
    let message = `تعذّر تحميل البيانات (${response.status}).`;
    let field: string | undefined;
    try {
      const body = await response.json();
      if (body?.error?.message) {
        message = body.error.message;
        field = body.error.field;
      }
    } catch {
      /* keep the fallback message */
    }
    throw new ApiError(response.status, message, field);
  }

  return response.json() as Promise<T>;
}

export interface ModelMeta {
  version: string;
  reportedAuc: number;
  isTrainedModel: boolean;
}

export function fetchKpis(filters: Partial<DashboardFilters>) {
  return getJson<{ kpis: Kpis; model: ModelMeta }>(
    "/api/kpis",
    filtersToQuery(filters),
  );
}

export function fetchRiskDistribution(filters: Partial<DashboardFilters>) {
  return getJson<{ distribution: RiskDistributionRow[] }>(
    "/api/analytics/risk-distribution",
    filtersToQuery(filters),
  );
}

export function fetchChurnTrend() {
  return getJson<{
    dataKind: "actual";
    trend: (MonthlyChurnActual & { label: string })[];
  }>("/api/analytics/churn-trend");
}

export function fetchFactors(filters: Partial<DashboardFilters>) {
  return getJson<{ dataKind: "predicted"; factors: FactorRow[] }>(
    "/api/analytics/factors",
    filtersToQuery(filters),
  );
}

export function fetchBreakdown(
  by: BreakdownTarget,
  filters: Partial<DashboardFilters>,
) {
  const params = filtersToQuery(filters);
  params.set("by", by);
  return getJson<{
    dataKind: "predicted";
    dimension: BreakdownTarget;
    rows: BreakdownRow[];
  }>("/api/analytics/breakdown", params);
}

export function fetchCustomers(options: {
  filters: Partial<DashboardFilters>;
  sort: SortKey;
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
}) {
  const params = filtersToQuery(options.filters);
  params.set("sort", options.sort);
  params.set("dir", options.direction);
  params.set("page", String(options.page));
  params.set("pageSize", String(options.pageSize));

  return getJson<
    Paginated<CustomerWithPrediction> & {
      sort: { key: SortKey; direction: "ASC" | "DESC" };
    }
  >("/api/customers", params);
}

export function fetchCustomer(id: string) {
  return getJson<{ customer: CustomerWithPrediction; model: ModelMeta }>(
    `/api/customers/${encodeURIComponent(id)}`,
  );
}

export function exportUrl(
  report: "high-risk" | "reasons" | "revenue",
  filters: Partial<DashboardFilters>,
): string {
  const params = filtersToQuery(filters);
  params.set("report", report);
  return `/api/export?${params}`;
}
