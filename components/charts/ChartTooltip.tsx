"use client";

import { useCallback, useState } from "react";

export interface TooltipRow {
  label: string;
  value: string;
}

export interface TooltipState {
  x: number;
  y: number;
  title: string;
  rows: TooltipRow[];
}

/**
 * Fixed-position tooltip driven by pointer coordinates.
 *
 * `position: fixed` with clientX/clientY avoids having to translate through the
 * SVG's own coordinate system, which is scaled by the viewBox and would put the
 * tooltip in the wrong place on any non-1:1 chart.
 */
export function ChartTooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null;

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 max-w-56 rounded-lg bg-ltt-navy px-3 py-2 text-xs leading-relaxed text-ink-on-dark shadow-xl"
      style={{
        // Nudge away from the cursor so the pointer never covers the reading.
        insetInlineStart: state.x + 14,
        top: state.y - 12,
      }}
    >
      <div className="mb-1 font-bold">{state.title}</div>
      {state.rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <span className="opacity-80">{row.label}</span>
          <span className="tnum font-semibold">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Shared show/move/hide wiring for a chart's interactive marks. */
export function useTooltip() {
  const [state, setState] = useState<TooltipState | null>(null);

  const show = useCallback(
    (event: { clientX: number; clientY: number }, title: string, rows: TooltipRow[]) => {
      setState({ x: event.clientX, y: event.clientY, title, rows });
    },
    [],
  );

  const hide = useCallback(() => setState(null), []);

  return { state, show, hide };
}
