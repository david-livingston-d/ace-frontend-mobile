import { useEffect, useState } from 'react';

/** Returns `value`, but only after it has stopped changing for `ms` — the
 * Orders search box debounces the query string this way so every keystroke
 * doesn't fire its own request. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return debounced;
}
