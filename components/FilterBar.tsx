"use client";

import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LABELS,
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABELS,
  PACKAGES,
  PACKAGE_LABELS,
  REGIONS,
  REGION_LABELS,
  RISK_LEVELS,
  RISK_LEVEL_LABELS,
  SUBSCRIPTION_TYPES,
  SUBSCRIPTION_TYPE_LABELS,
  TENURE_BANDS,
  TENURE_BAND_LABELS,
  USAGE_LEVELS,
  USAGE_LEVEL_LABELS,
} from "@/lib/taxonomy";
import type { DashboardFilters } from "@/lib/client/api";

interface SelectSpec {
  field: keyof DashboardFilters;
  allLabel: string;
  options: { value: string; label: string }[];
}

function toOptions<T extends string>(
  keys: readonly T[],
  labels: Record<T, string>,
) {
  return keys.map((key) => ({ value: key, label: labels[key] }));
}

const SELECTS: SelectSpec[] = [
  {
    field: "customerType",
    allLabel: "نوع العميل: الكل",
    options: toOptions(CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS),
  },
  {
    field: "subscriptionType",
    allLabel: "نوع الاشتراك: الكل",
    options: toOptions(SUBSCRIPTION_TYPES, SUBSCRIPTION_TYPE_LABELS),
  },
  {
    field: "package",
    allLabel: "الباقة: الكل",
    options: toOptions(PACKAGES, PACKAGE_LABELS),
  },
  {
    field: "region",
    allLabel: "المنطقة: الكل",
    options: toOptions(REGIONS, REGION_LABELS),
  },
  {
    field: "tenure",
    allLabel: "مدة الاشتراك: الكل",
    options: toOptions(TENURE_BANDS, TENURE_BAND_LABELS),
  },
  {
    field: "usage",
    allLabel: "استخدام البيانات: الكل",
    options: toOptions(USAGE_LEVELS, USAGE_LEVEL_LABELS),
  },
  {
    field: "status",
    allLabel: "حالة العميل: الكل",
    options: toOptions(ACCOUNT_STATUSES, ACCOUNT_STATUS_LABELS),
  },
  {
    field: "risk",
    allLabel: "مستوى الخطورة: الكل",
    options: toOptions(RISK_LEVELS, RISK_LEVEL_LABELS),
  },
];

/**
 * The global filter row. Every KPI, chart and table below reads from this state,
 * which is why it sits above the view switcher rather than inside any one view.
 */
export function FilterBar({
  filters,
  onChange,
  onReset,
  activeCount,
}: {
  filters: DashboardFilters;
  onChange: (field: keyof DashboardFilters, value: string) => void;
  onReset: () => void;
  activeCount: number;
}) {
  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink-muted">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="size-3.5"
          aria-hidden
        >
          <path d="M3 5h18M6 12h12M10 19h4" />
        </svg>
        الفلاتر
      </span>

      {SELECTS.map((spec) => (
        <label key={spec.field} className="contents">
          <span className="sr-only">{spec.allLabel}</span>
          <select
            value={filters[spec.field]}
            onChange={(event) => onChange(spec.field, event.target.value)}
            className="cursor-pointer rounded-lg border border-border bg-surface-sunken px-2.5 py-1.5 text-xs font-semibold text-ink"
          >
            <option value="all">{spec.allLabel}</option>
            {spec.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="ms-auto text-xs font-bold text-primary hover:underline"
        >
          إعادة تعيين الفلاتر ({activeCount})
        </button>
      )}
    </div>
  );
}
