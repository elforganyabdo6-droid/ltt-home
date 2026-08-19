"use client";

import { useEffect, useState } from "react";

import { fetchCustomer, type ModelMeta } from "@/lib/client/api";
import {
  formatDaysAgo,
  formatLyd,
  formatMonths,
  formatPct,
} from "@/lib/format";
import {
  ACCOUNT_STATUS_LABELS,
  CHURN_FACTOR_LABELS,
  CHURN_FACTORS,
  CUSTOMER_TYPE_LABELS,
  PACKAGE_LABELS,
  REGION_LABELS,
  RETENTION_ACTION_LABELS,
  SUBSCRIPTION_TYPE_LABELS,
  USAGE_LEVEL_LABELS,
} from "@/lib/taxonomy";
import type { CustomerWithPrediction } from "@/lib/types";

import { ChartSkeleton, ErrorState, RiskBadge } from "./ui";

const RISK_HERO: Record<string, string> = {
  low: "bg-good-tint text-good-ink",
  medium: "bg-warning-tint text-warning-ink",
  high: "bg-critical-tint text-critical-ink",
};

/**
 * Per-subscriber drill-down: the drawer that turns an aggregate into an action.
 *
 * Fetches on open rather than receiving the row, so the profile always reflects
 * the stored prediction rather than whatever the table page happened to hold.
 */
export function CustomerDrawer({
  customerId,
  onClose,
}: {
  customerId: string | null;
  onClose: () => void;
}) {
  /**
   * Results are stored tagged with the id they belong to, and loading/error are
   * derived by comparing that tag with the currently requested id.
   *
   * The alternative — clearing state at the top of the effect — is a synchronous
   * setState during an effect, which cascades an extra render and lets a slow
   * response for a previously opened subscriber paint over the current one.
   */
  const [result, setResult] = useState<{
    id: string;
    customer: CustomerWithPrediction;
    model: ModelMeta;
  } | null>(null);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (!customerId) return;

    let cancelled = false;

    fetchCustomer(customerId)
      .then((response) => {
        if (!cancelled) setResult({ id: customerId, ...response });
      })
      .catch((err: Error) => {
        if (!cancelled) setFailure({ id: customerId, message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const data = result && result.id === customerId ? result : null;
  const error = failure && failure.id === customerId ? failure.message : null;

  useEffect(() => {
    if (!customerId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [customerId, onClose]);

  const isOpen = customerId !== null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-[rgb(6_14_22/0.5)] transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="ملف العميل"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 z-50 w-[min(26rem,92vw)] overflow-y-auto bg-surface shadow-[var(--shadow-drawer)] transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        // RTL: the panel sits on the inline-start edge (visually left) and slides
        // out along +X, which is away from the viewport in a right-to-left frame.
        style={{ insetInlineEnd: 0 }}
      >
        {!isOpen ? null : error ? (
          <div className="p-5">
            <ErrorState message={error} />
            <button
              type="button"
              onClick={onClose}
              className="mt-2 text-xs font-bold text-primary"
            >
              إغلاق
            </button>
          </div>
        ) : !data ? (
          <div className="space-y-3 p-5">
            <ChartSkeleton height={92} />
            <ChartSkeleton height={150} />
            <ChartSkeleton height={120} />
          </div>
        ) : (
          <Profile data={data} onClose={onClose} />
        )}
      </aside>
    </>
  );
}

function Profile({
  data,
  onClose,
}: {
  data: { customer: CustomerWithPrediction; model: ModelMeta };
  onClose: () => void;
}) {
  const { customer } = data;
  const { prediction } = customer;

  const maxWeight = Math.max(
    ...CHURN_FACTORS.map((factor) => prediction.factors[factor]),
    1,
  );

  const rankedFactors = [...CHURN_FACTORS]
    .sort((a, b) => prediction.factors[b] - prediction.factors[a])
    .slice(0, 5);

  const facts: [string, string][] = [
    ["الباقة", PACKAGE_LABELS[customer.package]],
    ["نوع الاشتراك", SUBSCRIPTION_TYPE_LABELS[customer.subscriptionType]],
    ["نوع العميل", CUSTOMER_TYPE_LABELS[customer.customerType]],
    ["المنطقة", REGION_LABELS[customer.region]],
    ["مدة الاشتراك", formatMonths(customer.tenureMonths)],
    ["الاستخدام الشهري", USAGE_LEVEL_LABELS[customer.dataUsageLevel]],
    ["تغيّر الاستخدام", `${customer.usageChangePct > 0 ? "انخفاض " : "ارتفاع "}${Math.abs(customer.usageChangePct).toFixed(0)}%`],
    ["عدد الشكاوى", String(customer.complaintsCount)],
    ["آخر تفاعل", formatDaysAgo(customer.daysSinceInteraction)],
    ["تأخّر السداد", `${customer.paymentDelays} مرة`],
    ["الإيراد الشهري", formatLyd(customer.monthlyRevenueLyd)],
    ["حالة الحساب", ACCOUNT_STATUS_LABELS[customer.status]],
  ];

  return (
    <>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-ink">{customer.name}</h3>
          <p className="tnum mt-0.5 text-[11px] text-ink-muted">
            {customer.id} · {SUBSCRIPTION_TYPE_LABELS[customer.subscriptionType]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق ملف العميل"
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-sunken text-ink-secondary hover:text-ink"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-col gap-5 p-5">
        <div
          className={`flex items-center justify-between gap-3 rounded-xl p-4 ${RISK_HERO[prediction.riskLevel]}`}
        >
          <div>
            <div className="text-[11px] font-bold opacity-80">
              احتمالية المغادرة المتوقعة
            </div>
            <div className="text-3xl font-extrabold">
              {formatPct(prediction.churnProbability, 0)}
            </div>
            <div className="mt-0.5 text-[11px] opacity-80">
              ثقة النموذج {formatPct(prediction.confidence, 0)}
            </div>
          </div>
          <RiskBadge level={prediction.riskLevel} />
        </div>

        <section>
          <h4 className="mb-2 text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">
            بيانات العميل
          </h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {facts.map(([term, value]) => (
              <div key={term}>
                <dt className="text-[10.5px] font-bold text-ink-muted">{term}</dt>
                <dd className="tnum mt-0.5 text-xs font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h4 className="mb-2 text-[11px] font-extrabold tracking-wide text-ink-muted uppercase">
            العوامل المؤثرة
          </h4>
          <ul className="flex flex-col gap-2">
            {rankedFactors.map((factor) => {
              const share = (prediction.factors[factor] / maxWeight) * 100;
              return (
                <li key={factor} className="flex items-center gap-2.5">
                  <span className="w-28 shrink-0 text-[11px] text-ink-secondary">
                    {CHURN_FACTOR_LABELS[factor]}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(share, 3)}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[10.5px] leading-snug text-ink-muted">
            الأطوال نسبية لأقوى عامل لدى هذا العميل، وتوضح ما دفع النموذج إلى هذه
            النتيجة.
          </p>
        </section>

        <section className="rounded-xl border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-accent-tint p-4">
          <h4 className="mb-1.5 text-xs font-bold text-primary">
            الإجراء المقترح لمنع المغادرة
          </h4>
          <p className="text-sm font-extrabold text-ink">
            {RETENTION_ACTION_LABELS[prediction.recommendedAction]}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-secondary">
            مبني على العامل الأبرز:{" "}
            <b>{CHURN_FACTOR_LABELS[prediction.topFactor]}</b>.
            {customer.complaintsCount >= 3 &&
              prediction.topFactor !== "complaints" &&
              " يوجد أيضًا سجل شكاوى متكرر يستدعي المعالجة."}
          </p>
        </section>

        <p className="border-t border-border pt-3 text-[10.5px] leading-relaxed text-ink-muted">
          النتيجة تنبؤ من نموذج {prediction.modelVersion} بتاريخ{" "}
          <span className="tnum">{prediction.predictedAt}</span>، وليست مغادرة
          فعلية. البيانات تجريبية لأغراض التدريب والعرض.
        </p>
      </div>
    </>
  );
}
