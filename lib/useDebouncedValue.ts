import { useEffect, useState } from "react";

/**
 * Returns `value`, but only after it has stopped changing for `delayMs`.
 *
 * Typing "naruto" fires one state update per keystroke. This collapses them
 * into a single change ~400ms after the last keystroke, so we hit the API
 * once per pause instead of once per letter.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    // Clearing the pending timer on every change (and on unmount) is exactly
    // what makes this a debounce rather than a plain delay.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
