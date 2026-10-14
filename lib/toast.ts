/**
 * Minimal toast queue shared by every part of the app.
 *
 * It lives outside React in module state, exactly like the watchlist store,
 * so `toast()` can be called straight from an event handler without threading
 * a context provider through the tree. React subscribes via the exported
 * subscribe/getSnapshot pair, which is all useSyncExternalStore needs.
 */
export interface Toast {
  id: number;
  message: string;
}

/** Long enough to read a short sentence, short enough not to linger. */
const TOAST_LIFETIME_MS = 4000;

// Never mutated in place — every update swaps `toasts` for a new array — so a
// plain shared constant is safe and satisfies TypeScript's mutable type.
const EMPTY_TOASTS: Toast[] = [];

const listeners = new Set<() => void>();

let toasts: Toast[] = EMPTY_TOASTS;
let nextId = 1;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Shows a toast. Safe to call from any client-side event handler. */
export function toast(message: string): void {
  const item: Toast = { id: nextId++, message };
  toasts = [...toasts, item];
  emit();
  // Timers are unref-free here on purpose: the toast must survive even if the
  // component that created it has since unmounted.
  setTimeout(() => dismissToast(item.id), TOAST_LIFETIME_MS);
}

export function dismissToast(id: number): void {
  if (!toasts.some((item) => item.id === id)) {
    return;
  }
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): Toast[] {
  return toasts;
}

/** The server has no toasts, and neither does a page mid-hydration. */
export function getServerToasts(): Toast[] {
  return EMPTY_TOASTS;
}
