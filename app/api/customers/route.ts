import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api";
import { listCustomers } from "@/lib/db/queries";
import { parseFilters, parsePagination, parseSort } from "@/lib/validation";

/**
 * GET /api/customers
 *
 * Paginated prediction list. Filtering, searching, sorting and pagination all
 * happen in SQL — the client never receives rows it did not ask for.
 */
export async function GET(request: NextRequest) {
  try {
    await connection();

    const params = request.nextUrl.searchParams;
    const filters = parseFilters(params);
    const sort = parseSort(params);
    const pagination = parsePagination(params);

    const result = listCustomers(filters, sort, pagination);

    return Response.json({
      ...result,
      sort: { key: sort.key, direction: sort.direction },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
