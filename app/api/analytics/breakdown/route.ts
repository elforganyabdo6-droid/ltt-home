import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api";
import { getBreakdown } from "@/lib/db/queries";
import { parseBreakdown, parseFilters } from "@/lib/validation";

/**
 * GET /api/analytics/breakdown?by=package|region|subscriptionType|customerType|usage|status|tenure
 *
 * Average predicted churn probability grouped by one dimension, with subscriber
 * counts and revenue at risk per group.
 */
export async function GET(request: NextRequest) {
  try {
    await connection();

    const params = request.nextUrl.searchParams;
    const filters = parseFilters(params);
    const { dimension, column } = parseBreakdown(params);

    return Response.json({
      dataKind: "predicted",
      dimension,
      rows: getBreakdown(dimension, column, filters),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
