import { useEffect, useState } from 'react';

// A render-safe clock. Components used to call Date.now() in the middle of
// render, which the React purity lint rejects (and which made "days since"
// counts drift between re-renders). This hook reads the clock once per mount
// and then ticks it forward every minute, so a screen left open overnight
// still rolls its day counts at midnight without anyone touching it.
export function useNow(tickMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}
