import { connection } from "next/server";

import { handleApiError, jsonError } from "@/lib/api";
import { getCustomerById } from "@/lib/db/queries";
import { MODEL_REPORTED_AUC } from "@/lib/model";
import { assertValidCustomerId } from "@/lib/validation";

/**
 * GET /api/customers/[id]
 *
 * One subscriber with the current prediction and factor breakdown.
 *
 * `params` is a Promise in Next.js 16 and must be awaited — synchronous access
 * was removed in this major version. The inline type is used rather than the
 * generated `RouteContext<...>` helper so this file type-checks before the first
 * `next typegen` run.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connection();

    const { id } = await params;

    // Reject a malformed id before touching the database — a bad shape can never
    // match, and this keeps a 400 distinct from a genuine 404.
    assertValidCustomerId(id);

    const customer = getCustomerById(id);
    if (!customer) {
      return jsonError(404, `لا يوجد عميل بالرقم ${id}.`, "id");
    }

    return Response.json({
      customer,
      model: {
        version: customer.prediction.modelVersion,
        reportedAuc: MODEL_REPORTED_AUC,
        isTrainedModel: false,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
