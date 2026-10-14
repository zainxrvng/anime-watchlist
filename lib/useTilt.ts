"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Cached so a pointermove doesn't allocate a MediaQueryList 60 times a second,
 * but read live rather than once at mount so toggling the OS setting takes
 * effect on the next move.
 */
let reducedMotionQuery: MediaQueryList | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  reducedMotionQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return reducedMotionQuery.matches;
}

/**
 * Cursor-following 3D tilt for a card or any single element.
 *
 * The angles are written to `--tilt-x`/`--tilt-y` on the element rather than
 * into React state: this fires on every pointermove, and re-rendering 60 times
 * a second for something purely presentational would be waste — the CSS that
 * consumes the variables (`app/globals.css`, `.card-tilt`) reads them straight
 * off the element.
 *
 * Using `transform` for the rotation is deliberate. Tailwind v4 writes the
 * hover lift to the standalone `translate` property and the poster zoom to
 * `scale`, so the two compose with the rotation instead of all three fighting
 * over one `transform`.
 *
 * @param maxTiltDeg Peak rotation in degrees at the card's corners; 0 at centre.
 */
export function useTilt<T extends HTMLElement>(maxTiltDeg = 8) {
  const ref = useRef<T | null>(null);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<T>) => {
      // Tipping under a touch drag would fight the scroll gesture, and reduced
      // motion means the user asked for the card to stay put.
      if (event.pointerType !== "mouse" || prefersReducedMotion()) {
        return;
      }

      const element = ref.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      // Normalised position: 0 at the top-left corner, 1 at the bottom-right.
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      // Rotates away from the cursor, so the near edge tips toward the viewer.
      // (0.5 - y) makes the top of the card lean back as the cursor rises.
      element.style.setProperty("--tilt-x", `${(0.5 - y) * maxTiltDeg * 2}deg`);
      element.style.setProperty("--tilt-y", `${(x - 0.5) * maxTiltDeg * 2}deg`);
    },
    [maxTiltDeg],
  );

  /** Let the card settle back flat when the cursor leaves. */
  const onPointerLeave = useCallback(() => {
    ref.current?.style.setProperty("--tilt-x", "0deg");
    ref.current?.style.setProperty("--tilt-y", "0deg");
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
