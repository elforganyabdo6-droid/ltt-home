"use client";

import { formatInt, formatPct } from "@/lib/format";

import { ChartTooltip, useTooltip } from "./ChartTooltip";

export interface RiskSegment {
  riskLevel: "low" | "medium" | "high";
  label: string;
  customerCount: number;
}

const SEGMENT_COLOR: Record<RiskSegment["riskLevel"], string> = {
  low: "var(--good)",
  medium: "var(--warning)",
  high: "var(--critical)",
};

/**
 * Risk mix as a donut with a legend carrying counts and shares.
 *
 * Risk is never encoded by colour alone: the legend labels each band in Arabic
 * and repeats the count, which is what makes the amber/red pair legible to a
 * colour-blind reader.
 */
export function RiskDonutChart({
  segments,
  onSelect,
  selected,
}: {
  segments: RiskSegment[];
  onSelect?: (level: RiskSegment["riskLevel"]) => void;
  selected?: string;
}) {
  const { state, show, hide } = useTooltip();

  const size = 190;
  const center = size / 2;
  const outerRadius = 80;
  const innerRadius = 51;

  const total = segments.reduce((sum, s) => sum + s.customerCount, 0);

  // A 2px surface gap separates neighbouring arcs; converted to radians at the
  // outer radius so the visual gap is constant regardless of segment size.
  const gapRadians = total > 0 ? 2 / outerRadius : 0;

  const TAU = Math.PI * 2;
  const fractions = segments.map((segment) =>
    total > 0 ? segment.customerCount / total : 0,
  );

  /**
   * Exclusive prefix sum, recomputed per segment rather than carried in a
   * running variable — a variable reassigned during render is a stale-value bug
   * waiting to happen, and with three segments the cost is irrelevant.
   */
  const startAngleFor = (index: number) =>
    -Math.PI / 2 +
    fractions.slice(0, index).reduce((sum, fraction) => sum + fraction, 0) * TAU;

  const arcs = segments.map((segment, index) => {
    const fraction = fractions[index];
    const sweep = fraction * TAU;
    const start = startAngleFor(index);
    // Never let the gap invert a small arc into a negative sweep.
    const end = start + Math.max(sweep - gapRadians, 0.0001);

    const point = (radius: number, angle: number) => [
      center + radius * Math.cos(angle),
      center + radius * Math.sin(angle),
    ];

    const [x1, y1] = point(outerRadius, start);
    const [x2, y2] = point(outerRadius, end);
    const [x3, y3] = point(innerRadius, end);
    const [x4, y4] = point(innerRadius, start);
    const largeArc = end - start > Math.PI ? 1 : 0;

    const d =
      fraction > 0
        ? `M${x1},${y1} A${outerRadius},${outerRadius} 0 ${largeArc} 1 ${x2},${y2} ` +
          `L${x3},${y3} A${innerRadius},${innerRadius} 0 ${largeArc} 0 ${x4},${y4} Z`
        : "";

    return { segment, d, fraction };
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label="توزيع العملاء حسب مستوى الخطورة المتوقع"
      >
        {arcs.map(({ segment, d, fraction }) =>
          d ? (
            <path
              key={segment.riskLevel}
              d={d}
              fill={SEGMENT_COLOR[segment.riskLevel]}
              opacity={selected && selected !== segment.riskLevel ? 0.35 : 1}
              className={onSelect ? "cursor-pointer" : undefined}
              onClick={() => onSelect?.(segment.riskLevel)}
              onMouseMove={(event) =>
                show(event, `خطورة ${segment.label}`, [
                  { label: "عدد العملاء", value: formatInt(segment.customerCount) },
                  { label: "النسبة", value: formatPct(fraction * 100) },
                ])
              }
              onMouseLeave={hide}
            />
          ) : null,
        )}

        <text
          x={center}
          y={center - 3}
          textAnchor="middle"
          fontSize={21}
          fontWeight={800}
          fill="var(--ink)"
        >
          {formatInt(total)}
        </text>
        <text
          x={center}
          y={center + 16}
          textAnchor="middle"
          fontSize={10}
          fill="var(--ink-muted)"
        >
          إجمالي العملاء
        </text>
      </svg>

      <ul className="flex flex-col gap-3 text-xs">
        {segments.map((segment) => {
          const share = total > 0 ? (segment.customerCount / total) * 100 : 0;
          const isSelected = selected === segment.riskLevel;
          return (
            <li key={segment.riskLevel}>
              <button
                type="button"
                onClick={() => onSelect?.(segment.riskLevel)}
                aria-pressed={isSelected}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start transition-colors ${
                  onSelect ? "hover:bg-surface-sunken" : "cursor-default"
                } ${isSelected ? "bg-surface-sunken" : ""}`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: SEGMENT_COLOR[segment.riskLevel] }}
                />
                <span className="min-w-14 text-ink-secondary">{segment.label}</span>
                <span className="tnum font-bold text-ink">
                  {formatInt(segment.customerCount)}
                </span>
                <span className="tnum text-ink-muted">{formatPct(share, 0)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <ChartTooltip state={state} />
    </div>
  );
}
