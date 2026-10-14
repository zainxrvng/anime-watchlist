"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

/**
 * Loads the 3D layer on the client only, rendering nothing while it arrives —
 * the page is fully usable before a byte of three.js is fetched.
 */
const AmbientCanvas = dynamic(() => import("@/components/AmbientCanvas"), { ssr: false });

/** Cached: probing costs a canvas allocation, and support can't change. */
let webglSupport: boolean | undefined;

function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;

  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

/**
 * Whether the scene should be mounted. False during SSR and during the
 * hydration render, so the first client paint matches the server's `null` —
 * then useSyncExternalStore re-checks and mounts if it's safe.
 */
function ambientEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return supportsWebGL();
}

/** Re-render only when the user flips prefers-reduced-motion mid-session. */
function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function serverSnapshot(): boolean {
  return false;
}

/**
 * The fixed, non-interactive layer every page sits on top of.
 *
 * Two gates before anything renders, and both fail *closed*:
 *
 * - prefers-reduced-motion means the user asked for no movement, so there is
 *   nothing to show.
 * - WebGL can be missing entirely — headless runs, blocked GPUs, battery
 *   saver. Rather than let React Three Fiber throw a page error and fail every
 *   "no JavaScript errors" check, we detect it up front and render no canvas
 *   at all. The CSS layers (violet wash, cursor light) still light the page, so
 *   a WebGL-less browser degrades to a subtler version of the same design.
 *
 * `z-index: -1` puts it above the body background but below all content, which
 * is what lets it be genuinely behind the app rather than a tint over it.
 */
export function AmbientBackground() {
  const ready = useSyncExternalStore(subscribe, ambientEnabled, serverSnapshot);

  if (!ready) return null;

  return (
    <div aria-hidden="true" className="ambient-layer">
      <AmbientCanvas />
    </div>
  );
}
