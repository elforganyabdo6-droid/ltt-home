import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api";
import { csvResponse, toCsv } from "@/lib/csv";
import {
  getBreakdown,
  getFactorContributions,
  listAllForExport,
} from "@/lib/db/queries";
import {
  CUSTOMER_TYPE_LABELS,
  PACKAGE_LABELS,
  REGION_LABELS,
  RETENTION_ACTION_LABELS,
  RISK_LEVEL_LABELS,
  SUBSCRIPTION_TYPE_LABELS,
  USAGE_LEVEL_LABELS,
} from "@/lib/taxonomy";
import { parseFilters, parseReport, parseSort } from "@/lib/validation";

/**
 * GET /api/export?report=high-risk|reasons|revenue
 *
 * CSV export honouring the active filters. The report name is allowlisted in
 * `parseReport` — an unknown name is a 400, never an empty file.
 *
 * Headers are Arabic because the audience opens these in Excel; the underlying
 * values stay as stored keys only where they are identifiers (Customer ID).
 */
export async function GET(request: NextRequest) {
  try {
    await connection();

    const params = request.nextUrl.searchParams;
    const report = parseReport(params);
    const filters = parseFilters(params);

    if (report === "high-risk") {
      // The report *is* the high-risk list, so it pins risk regardless of the
      // caller's risk filter. Every other filter still applies.
      const rows = listAllForExport(
        { ...filters, risk: "high" },
        parseSort(params),
      );

      const csv = toCsv(
        [
          "Customer ID",
          "الاسم",
          "نوع العميل",
          "نوع الاشتراك",
          "الباقة",
          "المنطقة",
          "مدة الاشتراك (شهر)",
          "الاستخدام",
          "عدد الشكاوى",
          "آخر تفاعل (يوم)",
          "الإيراد الشهري (د.ل)",
          "احتمالية المغادرة %",
          "ثقة النموذج %",
          "مستوى الخطورة",
          "العامل الأبرز",
          "الإجراء المقترح",
        ],
        rows.map((r) => [
          r.id,
          r.name,
          CUSTOMER_TYPE_LABELS[r.customerType],
          SUBSCRIPTION_TYPE_LABELS[r.subscriptionType],
          PACKAGE_LABELS[r.package],
          REGION_LABELS[r.region],
          r.tenureMonths,
          USAGE_LEVEL_LABELS[r.dataUsageLevel],
          r.complaintsCount,
          r.daysSinceInteraction,
          r.monthlyRevenueLyd,
          r.prediction.churnProbability,
          r.prediction.confidence,
          RISK_LEVEL_LABELS[r.prediction.riskLevel],
          r.prediction.topFactor,
          RETENTION_ACTION_LABELS[r.prediction.recommendedAction],
        ]),
      );

      return csvResponse(csv, "العملاء-عاليو-الخطورة.csv");
    }

    if (report === "reasons") {
      const factors = getFactorContributions(filters);

      const csv = toCsv(
        ["العامل", "نسبة المساهمة %", "عدد العملاء الذين يمثل عاملهم الأبرز"],
        factors.map((f) => [f.label, f.contributionPct, f.dominantForCount]),
      );

      return csvResponse(csv, "أسباب-المغادرة.csv");
    }

    // report === "revenue"
    const rows = getBreakdown("region", "c.region", filters);

    const csv = toCsv(
      [
        "المنطقة",
        "عدد العملاء",
        "العملاء المعرضون للمغادرة",
        "متوسط احتمالية المغادرة %",
        "الإيراد الشهري المعرض للخطر (د.ل)",
      ],
      rows.map((r) => [
        r.label,
        r.customerCount,
        r.atRiskCount,
        r.averageProbability,
        r.revenueAtRiskLyd,
      ]),
    );

    return csvResponse(csv, "الإيراد-المعرض-للخطر.csv");
  } catch (error) {
    return handleApiError(error);
  }
}
