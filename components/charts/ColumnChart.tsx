"use client";

import { formatInt } from "@/lib/format";

import { ChartTooltip, useTooltip } from "./ChartTooltip";
import { useChartWidth } from "./useChartWidth";

export interface Column {
  key: string;
  label: string;
  value: number;
  customerCount: number;
}

/**
 * Average predicted churn probability by category.
 *
 * Bars are capped at 44px so a two-category view does not produce slabs, and the
 * highest column takes the darker step — the one comparison the reader is here
 * to make gets the emphasis.
 */
export function ColumnChart({
  data,
  onSelect,
  selectedKey,
}: {
  data: Column[];
  onSelect?: (key: string) => void;
  selectedKey?: string;
}) {
  const [ref, width] = useChartWidth(280);
  const { state, show, hide } = useTooltip();

  const height = 240;
  const padTop = 20;
  const padBottom = 40;
  const padInlineStart = 38;
  const padInlineEnd = 14;

  const plotWidth = Math.max(width - padInlineStart - padInlineEnd, 40);
  const plotHeight = height - padTop - padBottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1) * 1.22;
  const band = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(band * 0.5, 44);

  const peakIndex = data.reduce(
    (best, item, index) => (item.value > data[best].value ? index : best),
    0,
  );

  const ticks = 4;

  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        {Array.from({ length: ticks + 1 }, (_, t) => {
          const value = (maxValue / ticks) * t;
          const y = padTop + plotHeight - (value / maxValue) * plotHeight;
          return (
            <g key={t}>
              <line
                x1={padInlineStart}
                x2={width - padInlineEnd}
                y1={y}
                y2={y}
                stroke="var(--gridline)"
                strokeWidth={1}
              />
              <text
                x={padInlineStart - 7}
                y={y + 3}
                textAnchor="end"
                className="tnum"
                fontSize={10}
                fill="var(--ink-muted)"
              >
                {value.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {data.map((column, index) => {
          // RTL: first category at the right edge.
          const bandStart = width - padInlineEnd - (index + 1) * band;
          const x = bandStart + (band - barWidth) / 2;
          const barHeight = (column.value / maxValue) * plotHeight;
          const y = padTop + plotHeight - barHeight;
          const dimmed = selectedKey !== undefined && selectedKey !== column.key;

          return (
            <g key={column.key} opacity={dimmed ? 0.4 : 1}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx={4}
                fill={index === peakIndex ? "var(--seq-5)" : "var(--seq-3)"}
                className={onSelect ? "cursor-pointer" : undefined}
                onClick={() => onSelect?.(column.key)}
                onMouseMove={(event) =>
                  show(event, column.label, [
                    {
                      label: "متوسط احتمالية المغادرة",
                      value: `${column.value.toFixed(1)}%`,
                    },
                    { label: "عدد العملاء", value: formatInt(column.customerCount) },
                  ])
                }
                onMouseLeave={hide}
              />
              <text
                x={x + barWidth / 2}
                y={y - 7}
                textAnchor="middle"
                className="tnum"
                fontSize={10.5}
                fontWeight={700}
                fill="var(--ink-secondary)"
              >
                {column.value.toFixed(1)}%
              </text>
              <text
                x={bandStart + band / 2}
                y={height - 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--ink-muted)"
              >
                {column.label}
              </text>
              <text
                x={bandStart + band / 2}
                y={height - 4}
                textAnchor="middle"
                className="tnum"
                fontSize={9}
                fill="var(--ink-muted)"
              >
                {formatInt(column.customerCount)} عميل
              </text>
            </g>
          );
        })}

        <line
          x1={padInlineStart}
          x2={width - padInlineEnd}
          y1={padTop + plotHeight}
          y2={padTop + plotHeight}
          stroke="var(--border-strong)"
          strokeWidth={1}
        />
      </svg>
      <ChartTooltip state={state} />
    </div>
  );
}
