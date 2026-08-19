"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Track a container's rendered width so SVG geometry can be computed in real
 * pixels rather than guessed.
 *
 * Two guards matter:
 *
 *  - A minimum width, because a chart mounted inside a hidden panel measures 0,
 *    and zero-width geometry produces negative bar widths — which SVG rejects
 *    outright with "attribute width: A negative value is not valid".
 *
 *  - Both a ResizeObserver and a window resize listener. The observer is the
 *    precise mechanism, but its delivery is tied to the rendering loop and is
 *    suspended in environments that are not compositing frames (headless panes,
 *    background tabs). The window listener costs nothing and keeps the chart
 *    correct where the observer is throttled. A trailing rAF re-measure covers
 *    the case where the container is still settling on the frame we mount in —
 *    web-font metrics landing can change a grid track's width after first paint.
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

    let frame = 0;

    const measure = () => {
      const next = Math.max(element.clientWidth, minWidth);
      // Only commit real changes; an unconditional set would re-render on every
      // observer callback and, with the rAF below, could loop.
      setWidth((current) => (current === next ? current : next));
    };

    measure();
    frame = requestAnimationFrame(measure);

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [minWidth]);

  return [ref, width];
}
