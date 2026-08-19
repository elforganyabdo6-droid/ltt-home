"use client";

import { formatInt, formatLyd, formatPct } from "@/lib/format";
import type { Kpis, MonthlyChurnActual } from "@/lib/types";

export interface Alert {
  level: "critical" | "warning";
  title: string;
  detail: string;
}

/**
 * Derive alerts from the data rather than storing them.
 *
 * Each rule states the threshold it crossed in its own text — an alert that says
 * only "churn is rising" gives the reader nothing to act on or argue with.
 */
export function deriveAlerts(
  kpis: Kpis,
  trend: MonthlyChurnActual[],
): Alert[] {
  const alerts: Alert[] = [];

  if (trend.length >= 2) {
    const latest = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    if (latest.churnRatePct > previous.churnRatePct * 1.08) {
      alerts.push({
        level: "critical",
        title: "ارتفاع مفاجئ في معدل Churn الفعلي",
        detail: `ارتفع المعدل الشهري من ${formatPct(previous.churnRatePct, 2)} إلى ${formatPct(latest.churnRatePct, 2)} — زيادة ${formatPct(((latest.churnRatePct - previous.churnRatePct) / previous.churnRatePct) * 100, 0)} عن الشهر السابق.`,
      });
    }
  }

  const highShare =
    kpis.totalCustomers > 0
      ? (kpis.highRiskCustomers / kpis.totalCustomers) * 100
      : 0;
  if (highShare > 8) {
    alerts.push({
      level: "critical",
      title: "نسبة العملاء عاليي الخطورة تتجاوز الحد المقبول",
      detail: `${formatInt(kpis.highRiskCustomers)} عميل (${formatPct(highShare)}) باحتمالية مغادرة 61% أو أكثر، مقابل حد مرجعي 8%.`,
    });
  }

  const revenueShare =
    kpis.totalMonthlyRevenueLyd > 0
      ? (kpis.revenueAtRiskLyd / kpis.totalMonthlyRevenueLyd) * 100
      : 0;
  if (revenueShare > 25) {
    alerts.push({
      level: "warning",
      title: "ارتفاع الإيرادات المعرضة للخطر",
      detail: `${formatLyd(kpis.revenueAtRiskLyd)} شهريًا (${formatPct(revenueShare)} من الإيراد) مرتبطة بعملاء معرضين للمغادرة.`,
    });
  }

  if (kpis.averageConfidencePct > 0 && kpis.averageConfidencePct < 70) {
    alerts.push({
      level: "warning",
      title: "ثقة النموذج منخفضة في هذه الشريحة",
      detail: `متوسط الثقة ${formatPct(kpis.averageConfidencePct)} — تعامل مع الترتيب في هذه الشريحة بحذر وراجع اكتمال البيانات.`,
    });
  }

  return alerts;
}

const STYLES = {
  critical: {
    box: "border-[color-mix(in_srgb,var(--critical)_35%,transparent)] bg-critical-tint",
    icon: "text-critical",
  },
  warning: {
    box: "border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-warning-tint",
    icon: "text-warning-ink",
  },
} as const;

export function AlertStrip({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-5 flex flex-col gap-2" role="region" aria-label="التنبيهات">
      {alerts.map((alert) => {
        const style = STYLES[alert.level];
        return (
          <div
            key={alert.title}
            className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 ${style.box}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`mt-0.5 size-4 shrink-0 ${style.icon}`}
              aria-hidden
            >
              {alert.level === "critical" ? (
                <path d="M10.3 3.9 1.8 18a1.8 1.8 0 0 0 1.5 2.7h17.4a1.8 1.8 0 0 0 1.5-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0ZM12 9v4m0 4h.01" />
              ) : (
                <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v4m0 4h.01" />
              )}
            </svg>
            <div className="min-w-0 text-xs">
              <b className="block text-ink">{alert.title}</b>
              <span className="text-ink-secondary">{alert.detail}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
