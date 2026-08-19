import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api";
import { getKpis } from "@/lib/db/queries";
import { MODEL_REPORTED_AUC, MODEL_VERSION } from "@/lib/model";
import { parseFilters } from "@/lib/validation";

/**
 * GET /api/kpis
 *
 * Aggregate KPIs for the active filter set. Route Handlers are dynamic by
 * default in Next.js 16, and `connection()` additionally excludes the
 * synchronous `node:sqlite` read from prerendering, per the framework docs on
 * synchronous database drivers.
 */
export async function GET(request: NextRequest) {
  try {
    await connection();

    const filters = parseFilters(request.nextUrl.searchParams);
    const kpis = getKpis(filters);

    return Response.json({
      kpis,
      model: {
        version: MODEL_VERSION,
        reportedAuc: MODEL_REPORTED_AUC,
        // Stated plainly in the payload so no consumer can mistake the
        // heuristic scorer for a trained, evaluated model.
        isTrainedModel: false,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
