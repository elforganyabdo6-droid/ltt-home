"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Track a container's rendered width so SVG geometry can be computed in real
 * pixels rather than guessed.
 *
 * A minimum is enforced because a chart mounted inside a hidden panel measures
 * 0, and zero-width geometry produces negative bar widths — which SVG rejects
 * outright with "attribute width: A negative value is not valid".
 */
export function useChartWidth(minWidth = 260): [
  React.RefObject<HTMLDivElement | null>,
  number,
] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(minWidth);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      setWidth(Math.max(element.clientWidth, minWidth));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minWidth]);

  return [ref, width];
}
