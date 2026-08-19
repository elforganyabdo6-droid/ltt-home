"use client";

import {
  CUSTOMER_TYPE_LABELS,
  PACKAGE_LABELS,
  RETENTION_ACTION_LABELS,
  USAGE_LEVEL_LABELS,
} from "@/lib/taxonomy";
import { formatDaysAgo, formatInt } from "@/lib/format";
import type { CustomerWithPrediction, Paginated } from "@/lib/types";
import type { SortKey } from "@/lib/validation";

import { EmptyState, ProbabilityMeter, RiskBadge } from "./ui";

interface ColumnSpec {
  key: SortKey;
  label: string;
  sortable: boolean;
  align?: "start" | "end";
  render: (row: CustomerWithPrediction) => React.ReactNode;
}

const COLUMNS: ColumnSpec[] = [
  {
    key: "id",
    label: "Customer ID",
    sortable: true,
    render: (r) => <span className="tnum text-ink-muted">{r.id}</span>,
  },
  {
    key: "name",
    label: "الاسم",
    sortable: true,
    render: (r) => <b className="text-ink">{r.name}</b>,
  },
  {
    key: "customerType",
    label: "نوع العميل",
    sortable: true,
    render: (r) => CUSTOMER_TYPE_LABELS[r.customerType],
  },
  {
    key: "package",
    label: "الباقة",
    sortable: true,
    render: (r) => PACKAGE_LABELS[r.package],
  },
  {
    key: "tenure",
    label: "مدة الاشتراك",
    sortable: true,
    render: (r) => <span className="tnum">{r.tenureMonths} شهر</span>,
  },
  {
    key: "usage",
    label: "الاستخدام",
    sortable: true,
    render: (r) => USAGE_LEVEL_LABELS[r.dataUsageLevel],
  },
  {
    key: "complaints",
    label: "الشكاوى",
    sortable: true,
    render: (r) => <span className="tnum">{r.complaintsCount}</span>,
  },
  {
    key: "lastInteraction",
    label: "آخر تفاعل",
    sortable: true,
    render: (r) => (
      <span className="whitespace-nowrap">
        {formatDaysAgo(r.daysSinceInteraction)}
      </span>
    ),
  },
  {
    key: "probability",
    label: "احتمالية المغادرة",
    sortable: true,
    render: (r) => (
      <ProbabilityMeter
        probability={r.prediction.churnProbability}
        level={r.prediction.riskLevel}
      />
    ),
  },
  {
    key: "confidence",
    label: "ثقة النموذج",
    sortable: true,
    render: (r) => (
      <span className="tnum text-ink-secondary">
        {r.prediction.confidence.toFixed(0)}%
      </span>
    ),
  },
  {
    key: "risk",
    label: "مستوى الخطورة",
    sortable: false,
    render: (r) => <RiskBadge level={r.prediction.riskLevel} />,
  },
  {
    key: "id",
    label: "الإجراء المقترح",
    sortable: false,
    render: (r) => (
      <span className="text-ink-secondary">
        {RETENTION_ACTION_LABELS[r.prediction.recommendedAction]}
      </span>
    ),
  },
];

/**
 * The prediction table. Sorting, searching and pagination are all server-side —
 * the component holds no row data of its own beyond the current page.
 */
export function CustomerTable({
  data,
  sort,
  direction,
  search,
  onSortChange,
  onSearchChange,
  onPageChange,
  onSelectCustomer,
}: {
  data: Paginated<CustomerWithPrediction>;
  sort: SortKey;
  direction: "asc" | "desc";
  search: string;
  onSortChange: (key: SortKey) => void;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelectCustomer: (id: string) => void;
}) {
  const firstPage = Math.max(1, Math.min(data.page - 2, data.totalPages - 4));
  const lastPage = Math.min(data.totalPages, firstPage + 4);
  const pages = Array.from(
    { length: Math.max(lastPage - firstPage + 1, 1) },
    (_, i) => firstPage + i,
  );

  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="relative w-full max-w-64">
          <span className="sr-only">بحث بالاسم أو Customer ID</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="بحث بالاسم أو Customer ID…"
            className="w-full rounded-lg border border-border bg-surface-sunken py-1.5 pe-9 ps-3 text-xs text-ink"
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="pointer-events-none absolute end-3 top-2 size-3.5 text-ink-muted"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </label>
        <p className="text-xs text-ink-secondary">
          {data.total > 0 ? (
            <>
              عرض <b className="tnum">{data.rows.length}</b> من{" "}
              <b className="tnum">{formatInt(data.total)}</b> عميل
            </>
          ) : null}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[68rem] border-collapse text-xs">
          <thead>
            <tr>
              {COLUMNS.map((column, index) => {
                const isActive = column.sortable && sort === column.key;
                return (
                  <th
                    key={`${column.key}-${index}`}
                    scope="col"
                    aria-sort={
                      isActive
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className="sticky top-0 border-b border-border bg-surface-sunken px-3 py-2.5 text-start text-[11px] font-extrabold whitespace-nowrap text-ink-secondary"
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.key)}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        {column.label}
                        <span
                          className={isActive ? "text-primary" : "opacity-40"}
                          aria-hidden
                        >
                          {isActive ? (direction === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length}>
                  <EmptyState message="لا توجد نتائج مطابقة ضمن الفلاتر الحالية." />
                </td>
              </tr>
            ) : (
              data.rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`عرض ملف العميل ${row.name}`}
                  onClick={() => onSelectCustomer(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectCustomer(row.id);
                    }
                  }}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-sunken"
                >
                  {COLUMNS.map((column, index) => (
                    <td
                      key={`${column.key}-${index}`}
                      className="px-3 py-2 whitespace-nowrap"
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <nav
          className="no-print mt-3 flex items-center justify-center gap-1.5"
          aria-label="تصفّح الصفحات"
        >
          <PageButton
            label="‹"
            disabled={data.page <= 1}
            onClick={() => onPageChange(data.page - 1)}
            srLabel="الصفحة السابقة"
          />
          {pages.map((page) => (
            <PageButton
              key={page}
              label={String(page)}
              current={page === data.page}
              onClick={() => onPageChange(page)}
            />
          ))}
          <PageButton
            label="›"
            disabled={data.page >= data.totalPages}
            onClick={() => onPageChange(data.page + 1)}
            srLabel="الصفحة التالية"
          />
        </nav>
      )}
    </div>
  );
}

function PageButton({
  label,
  onClick,
  disabled,
  current,
  srLabel,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  srLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={current ? "page" : undefined}
      aria-label={srLabel}
      className={`tnum size-7 rounded-lg border text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        current
          ? "border-primary bg-primary text-white"
          : "border-border bg-surface text-ink-secondary hover:border-border-strong"
      }`}
    >
      {label}
    </button>
  );
}
