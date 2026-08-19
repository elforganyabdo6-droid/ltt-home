/**
 * CSV generation for report export.
 *
 * Two Excel-specific details matter for Arabic output:
 *   - a UTF-8 BOM, without which Excel decodes Arabic as mojibake
 *   - CRLF line endings, which Excel treats as the row separator
 */

const BOM = "﻿";

/**
 * Quote every field unconditionally and double any embedded quote.
 *
 * Unconditional quoting also neutralises the leading `=`, `+`, `-`, `@` formula
 * injection trick, since a quoted field is not parsed as a formula by Excel.
 */
function escapeField(value: string | number | boolean): string {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean)[])[],
): string {
  const lines = [headers.map(escapeField).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeField).join(","));
  }
  return BOM + lines.join("\r\n");
}

/**
 * Build a Response that downloads as a file.
 *
 * The filename is sent twice: a plain ASCII `filename` for older clients and an
 * RFC 5987 `filename*` carrying the real UTF-8 name, because a raw Arabic
 * filename in the header is not reliably decoded.
 */
export function csvResponse(csv: string, filename: string): Response {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      // A report reflects the filter set at the moment it was requested.
      "Cache-Control": "no-store",
    },
  });
}
