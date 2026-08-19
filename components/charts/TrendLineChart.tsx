"use client";

import { useState } from "react";

import { ChartTooltip, useTooltip } from "./ChartTooltip";
import { useChartWidth } from "./useChartWidth";

export interface TrendPoint {
  label: string;
  value: number;
  churnedCount: number;
}

/**
 * Measured monthly churn rate as a line with a soft area wash.
 *
 * Single series, so no legend box — the panel title already says what is
 * plotted. Only the final point is directly labelled; the axis and the hover
 * crosshair carry the rest, because a value on every point reads as noise.
 */
export function TrendLineChart({ data }: { data: TrendPoint[] }) {
  const [ref, width] = useChartWidth(280);
  const { state, show, hide } = useTooltip();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const height = 230;
  const padTop = 18;
  const padBottom = 30;
  const padInlineStart = 40;
  const padInlineEnd = 16;

  const plotWidth = Math.max(width - padInlineStart - padInlineEnd, 40);
  const plotHeight = height - padTop - padBottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1) * 1.25;

  // RTL: time runs right → left, so the earliest month sits at the right edge.
  const xFor = (index: number) =>
    width - padInlineEnd - (index / Math.max(data.length - 1, 1)) * plotWidth;
  const yFor = (value: number) =>
    padTop + plotHeight - (value / maxValue) * plotHeight;

  const linePath = data
    .map((point, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(point.value)}`)
    .join(" ");

  const areaPath =
    data.length > 0
      ? `${linePath} L${xFor(data.length - 1)},${yFor(0)} L${xFor(0)},${yFor(0)} Z`
      : "";

  const ticks = 4;
  const lastIndex = data.length - 1;

  function handleMove(event: React.MouseEvent<SVGRectElement>) {
    const rect = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    // Convert client px → viewBox units, then invert the RTL x mapping.
    const relX = ((event.clientX - rect.left) * width) / rect.width;
    const ratio = (width - padInlineEnd - relX) / plotWidth;
    const index = Math.round(ratio * Math.max(data.length - 1, 1));
    const clamped = Math.min(Math.max(index, 0), lastIndex);

    setHoverIndex(clamped);
    show(event, data[clamped].label, [
      { label: "معدل Churn الفعلي", value: `${data[clamped].value.toFixed(2)}%` },
      { label: "عدد المغادرين", value: data[clamped].churnedCount.toLocaleString("en-US") },
    ]);
  }

  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="معدل Churn الشهري الفعلي خلال آخر اثني عشر شهرًا"
      >
        {Array.from({ length: ticks + 1 }, (_, t) => {
          const value = (maxValue / ticks) * t;
          const y = yFor(value);
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
                x={padInlineStart - 8}
                y={y + 3}
                textAnchor="end"
                className="tnum"
                fontSize={10}
                fill="var(--ink-muted)"
              >
                {value.toFixed(1)}%
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="var(--primary)" opacity={0.1} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, i) =>
          i % 2 === 0 || i === lastIndex ? (
            <text
              key={point.label}
              x={xFor(i)}
              y={height - 10}
              textAnchor="middle"
              fontSize={10}
              fill="var(--ink-muted)"
            >
              {point.label}
            </text>
          ) : null,
        )}

        {hoverIndex !== null && (
          <line
            x1={xFor(hoverIndex)}
            x2={xFor(hoverIndex)}
            y1={padTop}
            y2={padTop + plotHeight}
            stroke="var(--border-strong)"
            strokeWidth={1}
          />
        )}

        {/* Most recent month: emphasised endpoint with the only direct label. */}
        {data.length > 0 && (
          <>
            <circle
              cx={xFor(lastIndex)}
              cy={yFor(data[lastIndex].value)}
              r={4.5}
              fill="var(--primary)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
            <text
              x={xFor(lastIndex) + 10}
              y={yFor(data[lastIndex].value) - 10}
              textAnchor="start"
              className="tnum"
              fontSize={11}
              fontWeight={700}
              fill="var(--ink-secondary)"
            >
              {data[lastIndex].value.toFixed(1)}%
            </text>
          </>
        )}

        {hoverIndex !== null && (
          <circle
            cx={xFor(hoverIndex)}
            cy={yFor(data[hoverIndex].value)}
            r={4.5}
            fill="var(--primary)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        )}

        <rect
          x={padInlineStart}
          y={padTop}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => {
            setHoverIndex(null);
            hide();
          }}
        />
      </svg>
      <ChartTooltip state={state} />
    </div>
  );
}
