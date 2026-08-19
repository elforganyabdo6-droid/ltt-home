"use client";

import {
  formatInt,
  formatLydCompact,
  formatMonths,
  formatPct,
} from "@/lib/format";
import type { Kpis } from "@/lib/types";

type Tone = "primary" | "warning" | "critical" | "good" | "accent";

const TONE_CLASS: Record<Tone, string> = {
  primary: "bg-primary-tint text-primary",
  accent: "bg-accent-tint text-primary",
  warning: "bg-warning-tint text-warning-ink",
  critical: "bg-critical-tint text-critical-ink",
  good: "bg-good-tint text-good-ink",
};

interface Tile {
  label: string;
  value: string;
  /** Secondary line: what the figure is relative to. */
  note: string;
  tone: Tone;
  icon: React.ReactNode;
}

const icons = {
  users: (
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  ),
  warn: (
    <path d="M10.3 3.9 1.8 18a1.8 1.8 0 0 0 1.5 2.7h17.4a1.8 1.8 0 0 0 1.5-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0ZM12 9v4m0 4h.01" />
  ),
  chart: <path d="M3 3v18h18M7 15l4-5 3 3 5-7" />,
  bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 3" />,
  cash: (
    <path d="M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  ),
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/**
 * The six headline KPIs.
 *
 * Every figure is derived from the active filter set, so each tile states what
 * it is relative to — a bare "198" invites the reader to assume it is the whole
 * base when a filter is on.
 */
export function KpiCards({ kpis }: { kpis: Kpis }) {
  const atRiskShare =
    kpis.totalCustomers > 0
      ? (kpis.atRiskCustomers / kpis.totalCustomers) * 100
      : 0;
  const highRiskShare =
    kpis.totalCustomers > 0
      ? (kpis.highRiskCustomers / kpis.totalCustomers) * 100
      : 0;
  const revenueShare =
    kpis.totalMonthlyRevenueLyd > 0
      ? (kpis.revenueAtRiskLyd / kpis.totalMonthlyRevenueLyd) * 100
      : 0;

  const tiles: Tile[] = [
    {
      label: "إجمالي العملاء",
      value: formatInt(kpis.totalCustomers),
      note: "ضمن الفلاتر الحالية",
      tone: "primary",
      icon: icons.users,
    },
    {
      label: "العملاء المعرضون للمغادرة",
      value: formatInt(kpis.atRiskCustomers),
      note: `${formatPct(atRiskShare)} من العملاء · خطورة متوسطة أو مرتفعة`,
      tone: "warning",
      icon: icons.warn,
    },
    {
      label: "نسبة Churn المتوقعة",
      value: formatPct(kpis.predictedChurnRatePct),
      note: `متوسط ثقة النموذج ${formatPct(kpis.averageConfidencePct, 0)}`,
      tone: "accent",
      icon: icons.chart,
    },
    {
      label: "العملاء عاليو الخطورة",
      value: formatInt(kpis.highRiskCustomers),
      note: `${formatPct(highRiskShare)} من العملاء · احتمالية 61%+`,
      tone: "critical",
      icon: icons.bolt,
    },
    {
      label: "متوسط مدة بقاء العميل",
      value: formatMonths(kpis.averageTenureMonths),
      note: "منذ بداية الاشتراك",
      tone: "primary",
      icon: icons.clock,
    },
    {
      label: "الإيراد المعرض للخطر",
      value: `${formatLydCompact(kpis.revenueAtRiskLyd)}/شهر`,
      note: `${formatPct(revenueShare)} من إيراد الفلاتر الحالية`,
      tone: "good",
      icon: icons.cash,
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <article
          key={tile.label}
          className="print-full flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11.5px] font-bold text-ink-secondary">
              {tile.label}
            </span>
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-lg ${TONE_CLASS[tile.tone]}`}
            >
              <Icon>{tile.icon}</Icon>
            </span>
          </div>
          {/* Proportional figures: tabular digits look loose at display size. */}
          <div className="text-xl font-extrabold tracking-tight text-ink">
            {tile.value}
          </div>
          <div className="text-[10.5px] leading-snug text-ink-muted">
            {tile.note}
          </div>
        </article>
      ))}
    </div>
  );
}
