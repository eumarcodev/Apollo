import { useCallback, useEffect, useRef, useState } from 'react';

/** A value that clears itself `durationMs` after it was shown (the 5 s result messages). */
export function useTransient<T>(durationMs: number): readonly [T | null, (value: T) => void] {
  const [value, setValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const show = useCallback(
    (next: T) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      setValue(next);
      timer.current = setTimeout(() => {
        timer.current = null;
        setValue(null);
      }, durationMs);
    },
    [durationMs],
  );

  return [value, show];
}
