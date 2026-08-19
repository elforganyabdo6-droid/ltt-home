import { connection } from "next/server";

import { handleApiError, jsonError } from "@/lib/api";
import { reseedDatabase } from "@/lib/db";

/**
 * POST /api/dev/reseed — development only.
 *
 * Regenerates the synthetic dataset in place. Needed because the running server
 * holds the SQLite file open, so `npm run db:reset` cannot delete it while the
 * server is up; and because changing the scoring function requires regenerating
 * every stored prediction.
 *
 * Returns 404 outside development. It is a destructive endpoint and must not
 * exist in a deployed build — a 404 rather than a 403 so it does not advertise
 * itself.
 */
export async function POST() {
  try {
    await connection();

    if (process.env.NODE_ENV === "production") {
      return jsonError(404, "غير موجود.");
    }

    const result = reseedDatabase();

    return Response.json({
      reseeded: true,
      customers: result.customers,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
