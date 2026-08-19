import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api";
import { getRiskDistribution } from "@/lib/db/queries";
import { parseFilters } from "@/lib/validation";

/**
 * GET /api/analytics/risk-distribution
 *
 * Subscriber counts per predicted risk band for the active filter set.
 */
export async function GET(request: NextRequest) {
  try {
    await connection();

    const filters = parseFilters(request.nextUrl.searchParams);

    return Response.json({ distribution: getRiskDistribution(filters) });
  } catch (error) {
    return handleApiError(error);
  }
}
