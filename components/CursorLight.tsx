"use client";

import { useEffect } from "react";

import { pointer } from "@/lib/pointer";

/**
 * The light that follows your cursor.
 *
 * Two jobs, one listener: it publishes the position into `lib/pointer.ts` for
 * the 3D scene's point light, and it writes `--pointer-x` / `--pointer-y` onto
 * `<html>` for the additive glow painted over the page. Writing CSS variables
 * keeps this out of React entirely — no render per pointermove.
 *
 * The glow sits above the app at z-45 (below toasts, which stay crisp) with
 * `pointer-events: none` and `plus-lighter`, so it *adds* light to whatever is
 * underneath rather than veiling it: cards, posters and sidebar all brighten
 * as the cursor passes. Touch devices get no hover state, and
 * prefers-reduced-motion opts out entirely.
 */
export function CursorLight() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const root = document.documentElement;

    const onMove = (event: PointerEvent) => {
      // Touch has no persistent cursor; a drag would drag the light with it.
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
        return;
      }

      pointer.x = event.clientX / window.innerWidth;
      pointer.y = event.clientY / window.innerHeight;
      pointer.active = true;

      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
      root.style.setProperty("--pointer-seen", "1");
    };

    const onLeave = () => {
      pointer.active = false;
      root.style.setProperty("--pointer-seen", "0");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      root.style.removeProperty("--pointer-x");
      root.style.removeProperty("--pointer-y");
      root.style.removeProperty("--pointer-seen");
      onLeave();
    };
  }, []);

  return <div aria-hidden="true" className="cursor-light" />;
}
