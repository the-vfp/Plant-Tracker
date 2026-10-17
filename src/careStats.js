// Watering-cadence arithmetic shared by the per-plant Watering Calendar
// (CareHeatmap.jsx) and the "Copy for Claude" context export (contextExport.js).
// Everything here works in local calendar days, because "watered on Tuesday"
// is how people think about it — not in 86,400,000 ms slices from the moment
// of the tap.

const DAY = 86_400_000;

export function startOfDay(input) {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Local YYYY-MM-DD, the key the heatmap buckets by. en-CA formats exactly that way.
export function dayKey(input) {
  return new Date(input).toLocaleDateString('en-CA');
}

// Whole calendar days from a to b (b later = positive). Rounded, not floored,
// so a DST hour doesn't drop a day.
export function calendarDaysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
}

export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 10) / 10;
}

// Cadence over a trailing window. `windowDays` = null means "all time".
// Gaps are measured between consecutive waterings *inside* the window, so a
// window with one watering has a count but no cadence.
// Returns { count, gaps, medianGap, minGap, maxGap, first, last }.
export function wateringStats(waterings, windowDays, nowMs) {
  const end = startOfDay(nowMs).getTime() + DAY; // exclusive end: tomorrow 00:00
  const start = windowDays == null ? -Infinity : end - windowDays * DAY;
  const dates = (waterings || [])
    .map((w) => new Date(w.date).getTime())
    .filter((t) => t >= start && t < end)
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    const g = calendarDaysBetween(dates[i - 1], dates[i]);
    if (g > 0) gaps.push(g); // two taps on the same day aren't a cadence
  }
  return {
    count: dates.length,
    gaps,
    medianGap: median(gaps),
    minGap: gaps.length ? Math.min(...gaps) : null,
    maxGap: gaps.length ? Math.max(...gaps) : null,
    first: dates.length ? new Date(dates[0]) : null,
    last: dates.length ? new Date(dates[dates.length - 1]) : null,
  };
}

// One-line reading of configured interval vs. what actually happened — the
// sentence a person would say out loud. null when there isn't enough data.
export function cadenceVerdict(configured, medianGap) {
  if (!configured || medianGap == null) return null;
  const diff = medianGap - configured;
  if (Math.abs(diff) <= 1) return 'right on schedule';
  if (diff > 0) return diff >= configured ? 'running far behind schedule' : 'running a little behind schedule';
  return -diff >= configured / 2 ? 'watered much more often than planned' : 'watered a bit more often than planned';
}
