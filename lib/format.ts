/**
 * Display formatting.
 *
 * Numerals are Western Arabic (0–9) rather than Eastern Arabic-Indic (٠–٩):
 * that is what LTT staff read in operational tooling and in Excel exports, and
 * it keeps figures aligned with the Latin technical terms beside them.
 */

const GROUPED = new Intl.NumberFormat("en-US");

export function formatInt(value: number): string {
  return GROUPED.format(Math.round(value));
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Libyan dinar. The unit follows the figure, as it does in Arabic usage. */
export function formatLyd(value: number): string {
  return `${GROUPED.format(Math.round(value))} د.ل`;
}

/** Compact form for KPI tiles, where a six-digit dinar figure would crowd. */
export function formatLydCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}م د.ل`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${(value / 1000).toFixed(0)}ألف د.ل`;
  }
  return formatLyd(value);
}

export function formatMonths(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 1) return "شهر واحد";
  if (rounded === 2) return "شهران";
  if (rounded <= 10) return `${rounded} أشهر`;
  return `${rounded} شهرًا`;
}

export function formatDaysAgo(days: number): string {
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days <= 10) return `قبل ${days} أيام`;
  return `قبل ${formatInt(days)} يومًا`;
}
