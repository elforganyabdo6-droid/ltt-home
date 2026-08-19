import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api";
import { getFactorContributions } from "@/lib/db/queries";
import { parseFilters } from "@/lib/validation";

/**
 * GET /api/analytics/factors
 *
 * Share of total churn-factor weight per factor, for the active filter set, plus
 * how many subscribers each factor is the dominant driver for.
 *
 * `dataKind: "predicted"` — these are model attributions, not observed causes of
 * past disconnections.
 */
export async function GET(request: NextRequest) {
  try {
    await connection();

    const filters = parseFilters(request.nextUrl.searchParams);

    return Response.json({
      dataKind: "predicted",
      factors: getFactorContributions(filters),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
