"use client";

import { Canvas } from "@react-three/fiber";

import { AmbientScene } from "@/components/AmbientScene";

/**
 * The WebGL canvas itself, as a default export so the ambient layer can load
 * it with `ssr: false`. Keeping this behind a dynamic import is what stops
 * three.js from being bundled into — and executed by — the server render.
 *
 * Every prop here is about cost: `alpha` leaves the clear transparent so the
 * page's own background shows through, the clamped `dpr` stops retina screens
 * from quadrupling fill rate, and antialiasing is off because Bloom's
 * mipmap blur already softens the edges.
 */
export default function AmbientCanvas() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 55 }}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
    >
      <AmbientScene />
    </Canvas>
  );
}
