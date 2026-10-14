// Where the cursor is, for consumers that must not re-render to follow it.
//
// Module scope deliberately, mirroring lib/toast.ts and the watchlist store:
// components/CursorLight.tsx writes this on every pointermove, and the 3D
// scene reads it once per frame. Routing it through React state instead would
// mean a render per frame for a value that only ever touches a light.
export interface PointerState {
  /** Normalised 0..1 across the viewport, origin top-left. */
  x: number;
  y: number;
  /** False until the pointer first moves, and again when it leaves the window. */
  active: boolean;
}

export const pointer: PointerState = { x: 0.5, y: 0.5, active: false };
