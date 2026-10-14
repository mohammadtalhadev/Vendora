import { useEffect, useState } from 'react';

/** A ticking clock for relative-time labels: re-renders on the given cadence while mounted. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
