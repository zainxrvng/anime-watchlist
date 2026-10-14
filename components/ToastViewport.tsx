"use client";

import { useSyncExternalStore } from "react";

import {
  dismissToast,
  getServerToasts,
  getToasts,
  subscribeToasts,
} from "@/lib/toast";

/**
 * Renders the toast queue. Mounted once by the root layout, so a toast raised
 * from a card, the detail page or the watchlist all land in the same place.
 */
export function ToastViewport() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      // A live region lets screen readers announce each toast as it arrives
      // without stealing focus from whatever the user is doing.
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className="toast-enter pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-accent/40 bg-zinc-900/95 py-3 pr-3 pl-4 text-sm text-zinc-100 shadow-xl shadow-black/40 backdrop-blur"
        >
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
          <span className="min-w-0 flex-1">{item.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(item.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      ))}
    </div>
  );
}
