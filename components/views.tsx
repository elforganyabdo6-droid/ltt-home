"use client";

import { formatInt, formatLyd, formatPct } from "@/lib/format";
import type { CustomerWithPrediction, Paginated } from "@/lib/types";
import type { SortKey } from "@/lib/validation";
import type { ModelMeta } from "@/lib/client/api";

import { ColumnChart } from "./charts/ColumnChart";
import { RankedBarChart } from "./charts/RankedBarChart";
import { RiskDonutChart } from "./charts/RiskDonutChart";
import { TrendLineChart } from "./charts/TrendLineChart";
import { CustomerTable } from "./CustomerTable";
import type { DashboardData } from "./Dashboard";
import {
  Button,
  ChartSkeleton,
  DataKindTag,
  ErrorState,
  Panel,
  SectionHeading,
} from "./ui";

export interface TableProps {
  data: Paginated<CustomerWithPrediction> | null;
  error: string | null;
  sort: SortKey;
  direction: "asc" | "desc";
  search: string;
  onSortChange: (key: SortKey) => void;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelectCustomer: (id: string) => void;
}

function Table({ table }: { table: TableProps }) {
  if (table.error) return <ErrorState message={table.error} />;
  if (!table.data) return <ChartSkeleton height={420} />;
  return (
    <CustomerTable
      data={table.data}
      sort={table.sort}
      direction={table.direction}
      search={table.search}
      onSortChange={table.onSortChange}
      onSearchChange={table.onSearchChange}
      onPageChange={table.onPageChange}
      onSelectCustomer={table.onSelectCustomer}
    />
  );
}

/* ------------------------------------------------------------- overview -- */

export function OverviewView({
  data,
  loading,
  onSelectRisk,
  selectedRisk,
}: {
  data: DashboardData;
  loading: boolean;
  onSelectRisk: (risk: string) => void;
  selectedRisk: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="معدل Churn عبر الزمن"
          subtitle="النسبة الشهرية المقيسة لمغادرة العملاء خلال آخر 12 شهرًا"
          tag={<DataKindTag kind="actual" />}
        >
          {loading ? (
            <ChartSkeleton />
          ) : (
            <TrendLineChart
              data={data.trend.map((point) => ({
                label: point.label,
                value: point.churnRatePct,
                churnedCount: point.customersChurned,
              }))}
            />
          )}
        </Panel>

        <Panel
          title="توزيع العملاء حسب مستوى الخطورة"
          subtitle="اضغط على أي مستوى لتصفية اللوحة بالكامل"
          tag={<DataKindTag kind="predicted" />}
        >
          {loading ? (
            <ChartSkeleton />
          ) : (
            <RiskDonutChart
              segments={data.distribution.map((row) => ({
                riskLevel: row.riskLevel,
                label: row.label,
                customerCount: row.customerCount,
              }))}
              onSelect={(level) =>
                onSelectRisk(selectedRisk === level ? "all" : level)
              }
              selected={selectedRisk === "all" ? undefined : selectedRisk}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="أهم العوامل المؤثرة في Churn"
          subtitle="نسبة مساهمة كل عامل في إجمالي وزن العوامل المرصود"
          tag={<DataKindTag kind="predicted" />}
        >
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <RankedBarChart
              data={data.factors.map((factor) => ({
                key: factor.factor,
                label: factor.label,
                value: factor.contributionPct,
                detail: [
                  {
                    label: "العامل الأبرز لدى",
                    value: `${formatInt(factor.dominantForCount)} عميل`,
                  },
                ],
              }))}
              tooltipValueLabel="نسبة المساهمة"
            />
          )}
        </Panel>

        <Panel
          title="العملاء المعرضون للمغادرة حسب المنطقة"
          subtitle="عدد العملاء متوسطي وعالي الخطورة، والإيراد المرتبط بهم"
          tag={<DataKindTag kind="predicted" />}
        >
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <RankedBarChart
              data={data.byRegion.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.atRiskCount,
                detail: [
                  { label: "إجمالي عملاء المنطقة", value: formatInt(row.customerCount) },
                  { label: "متوسط الاحتمالية", value: formatPct(row.averageProbability) },
                  { label: "إيراد معرض للخطر", value: formatLyd(row.revenueAtRiskLyd) },
                ],
              }))}
              valueSuffix=" عميل"
              decimals={0}
              tooltipValueLabel="معرضون للمغادرة"
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Churn حسب نوع الباقة"
        subtitle="متوسط احتمالية المغادرة المتوقعة لكل باقة"
        tag={<DataKindTag kind="predicted" />}
      >
        {loading ? (
          <ChartSkeleton height={240} />
        ) : (
          <ColumnChart
            data={data.byPackage.map((row) => ({
              key: row.key,
              label: row.label,
              value: row.averageProbability,
              customerCount: row.customerCount,
            }))}
          />
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------ customers -- */

export function CustomersView({
  data,
  loading,
  table,
}: {
  data: DashboardData;
  loading: boolean;
  table: TableProps;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="متوسط احتمالية Churn حسب مدة الاشتراك"
          subtitle="كلما طالت مدة بقاء العميل انخفضت مخاطر مغادرته"
          tag={<DataKindTag kind="predicted" />}
        >
          {loading ? (
            <ChartSkeleton height={240} />
          ) : (
            <ColumnChart
              data={data.byTenure.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.averageProbability,
                customerCount: row.customerCount,
              }))}
            />
          )}
        </Panel>

        <Panel
          title="متوسط احتمالية Churn حسب مستوى الاستخدام"
          subtitle="انخفاض الاستخدام مؤشر مبكر على المغادرة"
          tag={<DataKindTag kind="predicted" />}
        >
          {loading ? (
            <ChartSkeleton height={240} />
          ) : (
            <ColumnChart
              data={data.byUsage.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.averageProbability,
                customerCount: row.customerCount,
              }))}
            />
          )}
        </Panel>
      </div>

      <Panel
        title="سجل العملاء"
        subtitle="جميع العملاء ضمن الفلاتر الحالية — اضغط على أي صف لعرض الملف الكامل"
      >
        <Table table={table} />
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- prediction -- */

export function PredictionView({
  model,
  table,
}: {
  model: ModelMeta | null;
  table: TableProps;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ModelDisclosure model={model} />
      <Panel
        title="مخرجات النموذج لكل عميل"
        subtitle="مرتبة تنازليًا حسب احتمالية المغادرة — اضغط على أي عمود لتغيير الترتيب"
        tag={<DataKindTag kind="predicted" />}
      >
        <Table table={table} />
      </Panel>
    </div>
  );
}

/**
 * States plainly what the model is and is not.
 *
 * Required by the project's UI rules: a stakeholder must never be able to mistake
 * a hand-weighted demonstration scorer for a trained, evaluated model.
 */
function ModelDisclosure({ model }: { model: ModelMeta | null }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-border-strong bg-surface-sunken px-4 py-3 text-[11.5px] leading-relaxed text-ink-secondary">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className="mt-0.5 size-4 shrink-0 text-primary"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5m0 3h.01" />
      </svg>
      <p>
        <b className="text-ink">إصدار النموذج:</b>{" "}
        <span className="tnum">{model?.version ?? "—"}</span> ·{" "}
        <b className="text-ink">النوع:</b> دالة تقييم استدلالية بأوزان يدوية
        (Heuristic scoring function) وليست نموذج تعلم آلي مدرَّب. القيم المعروضة
        احتمالية متوقعة (Churn Probability) لعملاء نشطين حاليًا، وليست مغادرة
        فعلية. قيمة AUC{" "}
        <span className="tnum">
          {model ? model.reportedAuc.toFixed(3) : "—"}
        </span>{" "}
        مذكورة كمثال على مقياس التقييم المستهدف عند تدريب نموذج حقيقي، ولا تمثل
        نتيجة قياس فعلية.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- at risk -- */

export function AtRiskView({
  data,
  table,
}: {
  data: DashboardData;
  table: TableProps;
}) {
  const kpis = data.kpis;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat
          label="إجمالي المعرضين للمغادرة"
          value={kpis ? formatInt(kpis.atRiskCustomers) : "—"}
          note="خطورة متوسطة أو مرتفعة"
        />
        <MiniStat
          label="منهم عاليو الخطورة"
          value={kpis ? formatInt(kpis.highRiskCustomers) : "—"}
          note="احتمالية 61% أو أكثر — أولوية الاتصال"
        />
        <MiniStat
          label="الإيراد الشهري المعرض للخطر"
          value={kpis ? formatLyd(kpis.revenueAtRiskLyd) : "—"}
          note="مجموع إيراد العملاء المعرضين للمغادرة"
        />
      </div>

      <Panel
        title="قائمة العمل"
        subtitle="العملاء المعرضون للمغادرة مرتبين حسب الاحتمالية، مع الإجراء المقترح لكل عميل"
        tag={<DataKindTag kind="predicted" />}
      >
        <Table table={table} />
      </Panel>
    </div>
  );
}

function MiniStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="print-full rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="text-[11.5px] font-bold text-ink-secondary">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-ink">{value}</div>
      <div className="mt-1 text-[10.5px] text-ink-muted">{note}</div>
    </div>
  );
}

/* -------------------------------------------------------------- reasons -- */

export function ReasonsView({
  data,
  loading,
}: {
  data: DashboardData;
  loading: boolean;
}) {
  const top = data.factors.slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Panel
          title="مساهمة العوامل في احتمالية المغادرة"
          subtitle="ترتيب العوامل حسب نصيبها من إجمالي وزن العوامل"
          tag={<DataKindTag kind="predicted" />}
        >
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <RankedBarChart
              data={data.factors.map((factor) => ({
                key: factor.factor,
                label: factor.label,
                value: factor.contributionPct,
                detail: [
                  {
                    label: "العامل الأبرز لدى",
                    value: `${formatInt(factor.dominantForCount)} عميل`,
                  },
                ],
              }))}
              tooltipValueLabel="نسبة المساهمة"
            />
          )}
        </Panel>

        <Panel title="أهم الرؤى" subtitle="مستخلصة من الفلاتر النشطة">
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <ol className="flex flex-col gap-3">
              {top.map((factor, index) => (
                <li key={factor.factor} className="flex gap-2.5">
                  <span className="tnum grid size-6 shrink-0 place-items-center rounded-lg bg-primary-tint text-[11px] font-extrabold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <b className="text-xs text-ink">{factor.label}</b>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">
                      يمثل {formatPct(factor.contributionPct)} من إجمالي وزن
                      العوامل، وهو العامل الأبرز لدى{" "}
                      <b className="tnum">{formatInt(factor.dominantForCount)}</b>{" "}
                      عميل.
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="متوسط احتمالية Churn حسب الباقة"
          tag={<DataKindTag kind="predicted" />}
        >
          {loading ? (
            <ChartSkeleton height={240} />
          ) : (
            <ColumnChart
              data={data.byPackage.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.averageProbability,
                customerCount: row.customerCount,
              }))}
            />
          )}
        </Panel>

        <Panel
          title="الإيراد المعرض للخطر حسب المنطقة"
          subtitle="بالدينار الليبي شهريًا"
          tag={<DataKindTag kind="predicted" />}
        >
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <RankedBarChart
              data={data.byRegion.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.revenueAtRiskLyd,
                detail: [
                  { label: "عملاء معرضون", value: formatInt(row.atRiskCount) },
                ],
              }))}
              valueSuffix=" د.ل"
              decimals={0}
              tooltipValueLabel="إيراد معرض للخطر"
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- reports -- */

export function ReportsView({
  data,
  buildUrl,
  activeFilterCount,
}: {
  data: DashboardData;
  buildUrl: (report: "high-risk" | "reasons" | "revenue") => string;
  activeFilterCount: number;
}) {
  const reports = [
    {
      id: "high-risk" as const,
      title: "تقرير العملاء عاليي الخطورة",
      description:
        "قائمة كاملة بالعملاء ذوي احتمالية مغادرة 61% أو أكثر، مع ثقة النموذج والإجراء المقترح.",
      count: data.kpis ? `${formatInt(data.kpis.highRiskCustomers)} صف` : null,
    },
    {
      id: "reasons" as const,
      title: "تقرير أسباب Churn",
      description:
        "ترتيب العوامل المؤثرة مع نسبة مساهمة كل عامل وعدد العملاء الذين يمثل عاملهم الأبرز.",
      count: `${data.factors.length} عامل`,
    },
    {
      id: "revenue" as const,
      title: "تقرير الإيرادات المعرضة للخطر",
      description:
        "الإيراد الشهري المرتبط بالعملاء المعرضين للمغادرة، موزعًا حسب المنطقة.",
      count: `${data.byRegion.length} منطقة`,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        title="تصدير التقارير"
        description={
          activeFilterCount > 0
            ? `التقارير ستصدر ضمن الفلاتر النشطة حاليًا (${activeFilterCount} فلتر).`
            : "لا توجد فلاتر نشطة — ستصدر التقارير لكل العملاء."
        }
      />

      {reports.map((report) => (
        <div
          key={report.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-tint text-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden
              >
                <path d="M6 2h9l5 5v15H6zM15 2v5h5M9 13h6M9 17h6" />
              </svg>
            </span>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-ink">{report.title}</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-secondary">
                {report.description}
              </p>
              {report.count && (
                <p className="tnum mt-1 text-[10.5px] text-ink-muted">
                  {report.count}
                </p>
              )}
            </div>
          </div>
          <div className="no-print flex shrink-0 gap-2">
            {/* A real navigation, not a JS click handler: the browser handles the
                download and the Content-Disposition header names the file. */}
            <a
              href={buildUrl(report.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-border-strong"
            >
              تصدير Excel (CSV)
            </a>
            <Button variant="primary" onClick={() => window.print()}>
              طباعة / PDF
            </Button>
          </div>
        </div>
      ))}

      <p className="rounded-xl border border-dashed border-border-strong bg-surface-sunken px-4 py-3 text-[11px] leading-relaxed text-ink-secondary">
        ملف CSV يُصدَّر بترميز UTF-8 مع علامة BOM حتى تظهر الحروف العربية بشكل
        صحيح في Excel. لتصدير PDF استخدم زر الطباعة ثم اختر «حفظ كملف PDF» من
        نافذة الطباعة.
      </p>
    </div>
  );
}
