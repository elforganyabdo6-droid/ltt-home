import { connection } from "next/server";

import { handleApiError } from "@/lib/api";
import { monthLabelAr } from "@/lib/data/generate";
import { getChurnTrend } from "@/lib/db/queries";

/**
 * GET /api/analytics/churn-trend
 *
 * Measured monthly churn for the trailing year.
 *
 * `dataKind: "actual"` is part of the contract: this endpoint returns recorded
 * history, never model output, and the UI labels it as such. Filters do not apply
 * — these are stored aggregates, not per-subscriber rows, so they cannot be
 * sliced by package or region without misrepresenting them.
 */
export async function GET() {
  try {
    await connection();

    const trend = getChurnTrend().map((row) => ({
      ...row,
      label: monthLabelAr(row.month),
    }));

    return Response.json({ dataKind: "actual", trend });
  } catch (error) {
    return handleApiError(error);
  }
}
