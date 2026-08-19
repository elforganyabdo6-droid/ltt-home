"use client";

import { ChartTooltip, useTooltip } from "./ChartTooltip";
import { useChartWidth } from "./useChartWidth";

export interface RankedBar {
  key: string;
  label: string;
  value: number;
  /** Extra rows for the hover tooltip. */
  detail?: { label: string; value: string }[];
}

const RAMP = ["var(--seq-5)", "var(--seq-4)", "var(--seq-3)", "var(--seq-2)", "var(--seq-1)"];

/**
 * Ranked horizontal bars, laid out for RTL: the label column is flush to the
 * right and each bar grows leftward from it.
 *
 * All geometry is clamped inside the viewBox. Getting this wrong is silent —
 * marks drawn past the viewBox simply vanish rather than erroring — so the bar's
 * left edge is computed from the track, never from an unbounded width.
 */
export function RankedBarChart({
  data,
  valueSuffix = "%",
  decimals = 1,
  tooltipValueLabel = "القيمة",
  onSelect,
  selectedKey,
}: {
  data: RankedBar[];
  valueSuffix?: string;
  decimals?: number;
  tooltipValueLabel?: string;
  onSelect?: (key: string) => void;
  selectedKey?: string;
}) {
  const [ref, width] = useChartWidth(280);
  const { state, show, hide } = useTooltip();

  const rowHeight = 30;
  const barHeight = 17;
  const height = Math.max(data.length * rowHeight + 8, 40);

  const labelWidth = width < 380 ? 92 : 140;
  // Room at the far end for a value label that does not fit inside its bar.
  const valueGutter = 52;

  const trackEnd = width - labelWidth;
  const trackStart = valueGutter;
  const trackWidth = Math.max(trackEnd - trackStart, 30);

  const maxValue = Math.max(...data.map((d) => d.value), 0) * 1.12 || 1;

  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        {data.map((bar, index) => {
          const y = index * rowHeight + 5;
          const barWidth = Math.max((bar.value / maxValue) * trackWidth, 3);
          const barStart = trackEnd - barWidth;
          const color = RAMP[Math.min(index, RAMP.length - 1)];
          const display = `${bar.value.toFixed(decimals)}${valueSuffix}`;
          const dimmed = selectedKey !== undefined && selectedKey !== bar.key;

          // Only place the value inside the bar when it comfortably fits;
          // otherwise it goes just outside the bar's leading edge.
          const labelFitsInside = barWidth > 52;

          return (
            <g key={bar.key} opacity={dimmed ? 0.4 : 1}>
              <text
                x={width - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--ink-secondary)"
              >
                {bar.label}
              </text>

              <rect
                x={trackStart}
                y={y}
                width={trackWidth}
                height={barHeight}
                rx={4}
                fill="var(--surface-sunken)"
              />

              <rect
                x={barStart}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={color}
                className={onSelect ? "cursor-pointer" : undefined}
                onClick={() => onSelect?.(bar.key)}
                onMouseMove={(event) =>
                  show(event, bar.label, [
                    { label: tooltipValueLabel, value: display },
                    ...(bar.detail ?? []),
                  ])
                }
                onMouseLeave={hide}
              />

              <text
                x={labelFitsInside ? barStart + 8 : barStart - 6}
                y={y + barHeight / 2 + 4}
                textAnchor={labelFitsInside ? "start" : "end"}
                className="tnum"
                fontSize={10.5}
                fontWeight={700}
                fill={labelFitsInside ? "#ffffff" : "var(--ink-secondary)"}
              >
                {display}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip state={state} />
    </div>
  );
}
