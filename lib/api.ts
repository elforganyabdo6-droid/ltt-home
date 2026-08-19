/**
 * Shared Route Handler helpers.
 *
 * Error responses carry a message and nothing else. No stack trace, SQL
 * fragment, or filesystem path may reach the client — see SECURITY-CHECKLIST.md.
 */

import { ValidationError } from "./validation";

export interface ApiErrorBody {
  error: {
    message: string;
    field?: string;
  };
}

export function jsonError(
  status: number,
  message: string,
  field?: string,
): Response {
  const body: ApiErrorBody = {
    error: field ? { message, field } : { message },
  };
  return Response.json(body, { status });
}

/**
 * Map a thrown error to a response. A {@link ValidationError} is the caller's
 * fault and says so specifically; anything else is ours and stays opaque.
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof ValidationError) {
    return jsonError(400, error.message, error.field);
  }

  // Server-side only — the client gets the generic message below.
  console.error("[api] unhandled error:", error);

  return jsonError(500, "حدث خطأ غير متوقع في الخادم. تمت تسجيل المشكلة.");
}
