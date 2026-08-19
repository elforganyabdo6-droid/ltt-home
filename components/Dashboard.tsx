"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EMPTY_FILTERS,
  exportUrl,
  fetchBreakdown,
  fetchChurnTrend,
  fetchFactors,
  fetchKpis,
  fetchRiskDistribution,
  fetchCustomers,
  filtersToQuery,
  type DashboardFilters,
  type ModelMeta,
} from "@/lib/client/api";
import type {
  BreakdownRow,
  CustomerWithPrediction,
  FactorRow,
  Kpis,
  MonthlyChurnActual,
  Paginated,
} from "@/lib/types";
import type { RiskDistributionRow } from "@/lib/db/queries";
import type { SortKey } from "@/lib/validation";

import { AlertStrip, deriveAlerts } from "./AlertStrip";
import { CustomerDrawer } from "./CustomerDrawer";
import { FilterBar } from "./FilterBar";
import { KpiCards } from "./KpiCards";
import { Sidebar, VIEW_META, type ViewId } from "./Sidebar";
import { ChartSkeleton, ErrorState } from "./ui";
import {
  AtRiskView,
  CustomersView,
  OverviewView,
  PredictionView,
  ReasonsView,
  ReportsView,
} from "./views";

const PAGE_SIZE = 10;

export interface DashboardData {
  kpis: Kpis | null;
  model: ModelMeta | null;
  distribution: RiskDistributionRow[];
  trend: (MonthlyChurnActual & { label: string })[];
  factors: FactorRow[];
  byPackage: BreakdownRow[];
  byRegion: BreakdownRow[];
  byTenure: BreakdownRow[];
  byUsage: BreakdownRow[];
}

const EMPTY_DATA: DashboardData = {
  kpis: null,
  model: null,
  distribution: [],
  trend: [],
  factors: [],
  byPackage: [],
  byRegion: [],
  byTenure: [],
  byUsage: [],
};

/**
 * The dashboard container.
 *
 * Filter state lives here and drives every request, so KPIs, charts and the
 * table can never disagree about what is being shown. Deliberately kept in React
 * state rather than the URL: `useSearchParams` requires a Suspense boundary or
 * the production build fails, and it appears to work in dev — a trap worth
 * avoiding for a training project.
 */
export function Dashboard() {
  const [view, setView] = useState<ViewId>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);

  /**
   * Fetched results are stored tagged with the request key that produced them,
   * and loading/error are derived by comparing that tag with the current key.
   *
   * This is why there is no `setLoading(true)` at the top of the effects: a
   * synchronous setState inside an effect costs an extra render pass and, worse,
   * lets a slow response for a superseded filter set paint over the current one.
   */
  const [aggregates, setAggregates] = useState<{
    key: string;
    data: DashboardData;
  } | null>(null);
  const [aggregateFailure, setAggregateFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);

  const [tableResult, setTableResult] = useState<{
    key: string;
    data: Paginated<CustomerWithPrediction>;
  } | null>(null);
  const [tableFailure, setTableFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);

  const [sort, setSort] = useState<SortKey>("probability");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  /** Filters as sent to the API, with the table's own search folded in. */
  const queryFilters = useMemo(
    () => ({ ...filters, q: debouncedSearch }),
    [filters, debouncedSearch],
  );

  /**
   * The at-risk view is the medium+high slice, applied with the API's `atRisk`
   * flag so the reported total matches the rows shown. It does not override an
   * explicit risk choice from the filter bar.
   */
  const tableFilters = useMemo(() => {
    if (view === "at-risk" && queryFilters.risk === "all") {
      return { ...queryFilters, atRisk: "true" };
    }
    return queryFilters;
  }, [view, queryFilters]);

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  /** Identity of the current aggregate request; also the cache tag. */
  const aggregateKey = useMemo(
    () => `${filtersToQuery(queryFilters)}|${reloadToken}`,
    [queryFilters, reloadToken],
  );

  const tableKey = useMemo(
    () =>
      `${filtersToQuery(tableFilters)}|${sort}|${direction}|${page}|${reloadToken}`,
    [tableFilters, sort, direction, page, reloadToken],
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchKpis(queryFilters),
      fetchRiskDistribution(queryFilters),
      fetchChurnTrend(),
      fetchFactors(queryFilters),
      fetchBreakdown("package", queryFilters),
      fetchBreakdown("region", queryFilters),
      fetchBreakdown("tenure", queryFilters),
      fetchBreakdown("usage", queryFilters),
    ])
      .then(([kpis, risk, trend, factors, pkg, region, tenure, usage]) => {
        if (cancelled) return;
        setAggregates({
          key: aggregateKey,
          data: {
            kpis: kpis.kpis,
            model: kpis.model,
            distribution: risk.distribution,
            trend: trend.trend,
            factors: factors.factors,
            byPackage: pkg.rows,
            byRegion: region.rows,
            byTenure: tenure.rows,
            byUsage: usage.rows,
          },
        });
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setAggregateFailure({ key: aggregateKey, message: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
    // queryFilters is fully described by aggregateKey, which is what changes.
  }, [aggregateKey, queryFilters]);

  useEffect(() => {
    let cancelled = false;

    fetchCustomers({
      filters: tableFilters,
      sort,
      direction,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (!cancelled) setTableResult({ key: tableKey, data: result });
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setTableFailure({ key: tableKey, message: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tableKey, tableFilters, sort, direction, page]);

  const data = aggregates?.data ?? EMPTY_DATA;
  const aggregateError =
    aggregateFailure?.key === aggregateKey ? aggregateFailure.message : null;
  /**
   * Skeletons only on the very first load. On a later filter change the previous
   * chart stays up until the new data lands, which reads as a refresh rather than
   * the whole page blinking out.
   */
  const initialLoading = !aggregates && !aggregateError;

  // Stale rows stay visible while the next page loads, same as the charts.
  const table = tableResult?.data ?? null;
  const tableError =
    tableFailure?.key === tableKey ? tableFailure.message : null;

  /** Changing what is being filtered invalidates whatever page we were on. */
  const handleFilterChange = useCallback(
    (field: keyof DashboardFilters, value: string) => {
      setFilters((current) => ({ ...current, [field]: value }));
      setPage(1);
    },
    [],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleViewChange = useCallback((next: ViewId) => {
    setView(next);
    setNavOpen(false);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((key: SortKey) => {
    setSort((currentKey) => {
      if (currentKey === key) {
        setDirection((d) => (d === "asc" ? "desc" : "asc"));
        return currentKey;
      }
      setDirection("desc");
      return key;
    });
  }, []);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) => key !== "q" && value !== "all",
      ).length,
    [filters],
  );

  const alerts = useMemo(
    () => (data.kpis ? deriveAlerts(data.kpis, data.trend) : []),
    [data.kpis, data.trend],
  );

  const meta = VIEW_META[view];

  const tableProps = {
    data: table,
    error: tableError,
    sort,
    direction,
    search,
    onSortChange: handleSortChange,
    onSearchChange: handleSearchChange,
    onPageChange: setPage,
    onSelectCustomer: setSelectedCustomer,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        active={view}
        onNavigate={handleViewChange}
        atRiskCount={data.kpis?.atRiskCustomers ?? null}
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-border bg-surface/90 px-5 py-3.5 backdrop-blur-sm">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="فتح القائمة"
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-ink-secondary lg:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="size-4"
                aria-hidden
              >
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-ink">{meta.title}</h1>
              <p className="mt-0.5 text-[11.5px] text-ink-secondary">
                {meta.description}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-[95rem] px-5 pt-4 pb-14">
          <FilterBar
            filters={filters}
            onChange={handleFilterChange}
            onReset={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
            activeCount={activeFilterCount}
          />

          {aggregateError ? (
            <ErrorState
              message={aggregateError}
              onRetry={() => setReloadToken((t) => t + 1)}
            />
          ) : (
            <>
              <AlertStrip alerts={alerts} />

              {data.kpis ? (
                <KpiCards kpis={data.kpis} />
              ) : (
                <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                  {Array.from({ length: 6 }, (_, i) => (
                    <ChartSkeleton key={i} height={104} />
                  ))}
                </div>
              )}

              {view === "overview" && (
                <OverviewView
                  data={data}
                  loading={initialLoading}
                  onSelectRisk={(risk) => handleFilterChange("risk", risk)}
                  selectedRisk={filters.risk}
                />
              )}
              {view === "customers" && (
                <CustomersView
                  data={data}
                  loading={initialLoading}
                  table={tableProps}
                />
              )}
              {view === "prediction" && (
                <PredictionView model={data.model} table={tableProps} />
              )}
              {view === "at-risk" && (
                <AtRiskView data={data} table={tableProps} />
              )}
              {view === "reasons" && (
                <ReasonsView data={data} loading={initialLoading} />
              )}
              {view === "reports" && (
                <ReportsView
                  data={data}
                  buildUrl={(report) => exportUrl(report, queryFilters)}
                  activeFilterCount={activeFilterCount}
                />
              )}
            </>
          )}
        </main>
      </div>

      <CustomerDrawer
        customerId={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}

/**
 * Cycles system → dark → light. "System" is a real state, not a synonym for
 * light, so it gets its own step rather than being collapsed away.
 */
function ThemeToggle() {
  const [mode, setMode] = useState<"system" | "dark" | "light">("system");

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
  }, [mode]);

  const next = { system: "dark", dark: "light", light: "system" } as const;
  const label = { system: "تلقائي", dark: "ليلي", light: "نهاري" }[mode];

  return (
    <button
      type="button"
      onClick={() => setMode(next[mode])}
      title={`المظهر: ${label} — اضغط للتبديل`}
      className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-ink-secondary hover:text-ink"
    >
      ◐ {label}
    </button>
  );
}
