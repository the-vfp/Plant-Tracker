import { useState, useMemo } from 'react';
import { NOTE_KIND, ACTION } from '../careLog.js';
import { startOfDay, dayKey, wateringStats } from '../careStats.js';

// Watering Calendar — real wall-calendar months, newest on top, one circle per
// day. Green = watered that day (once or ten times, it's one day), a small dot
// = some other logged care (fertilize, rotate, repot…), a ring = today, an
// orange ring = the day you tapped. Days before the plant joined the
// collection stay blank so a new plant doesn't look neglected for months it
// wasn't here. The window buttons choose how many months are stacked.

const WINDOWS = [
  { label: '1 mo', months: 1, phrase: 'month' },
  { label: '3 mo', months: 3, phrase: '3 months' },
  { label: '6 mo', months: 6, phrase: '6 months' },
  { label: '1 yr', months: 12, phrase: 'year' },
];

const DAY = 86_400_000;
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function formatDay(d) {
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CareCalendar({ waterings, notes, createdAt, now }) {
  const [expanded, setExpanded] = useState(true);
  const [winIdx, setWinIdx] = useState(1);
  const [selected, setSelected] = useState(null);
  const win = WINDOWS[winIdx];

  const { months, byDay, stats, todayKey } = useMemo(() => {
    const today = startOfDay(now);
    const todayKey = dayKey(today);
    const born = createdAt ? startOfDay(createdAt).getTime() : -Infinity;

    const byDay = {};
    for (const w of waterings || []) {
      const k = dayKey(w.date);
      (byDay[k] ||= { water: false, care: [] }).water = true;
    }
    for (const n of notes || []) {
      const kind = NOTE_KIND[n.emoji];
      if (!kind) continue; // plain 📝 notes aren't "care"
      const k = dayKey(n.date);
      const slot = (byDay[k] ||= { water: false, care: [] });
      if (!slot.care.includes(kind)) slot.care.push(kind);
    }

    // Newest month first. Each month is a 7-wide grid starting on Monday.
    const months = [];
    for (let i = 0; i < win.months; i++) {
      const first = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      const lead = (first.getDay() + 6) % 7;
      const days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(first.getFullYear(), first.getMonth(), d);
        const k = dayKey(date);
        days.push({
          key: k, date, num: d,
          future: date > today,
          blank: date.getTime() < born,
          ...(byDay[k] || { water: false, care: [] }),
        });
      }
      months.push({ key: `${first.getFullYear()}-${first.getMonth()}`, first, lead, days });
    }

    const oldest = months[months.length - 1].first;
    const windowDays = Math.round((today - oldest) / DAY) + 1;
    return { months, byDay, stats: wateringStats(waterings, windowDays, now), todayKey };
  }, [waterings, notes, createdAt, now, win.months]);

  const selectedDay = selected ? byDay[selected] || { water: false, care: [] } : null;
  let caption;
  if (selected) {
    const parts = [];
    if (selectedDay.water) parts.push('💧 watered');
    for (const kind of selectedDay.care) {
      const a = ACTION[kind];
      if (a) parts.push(`${a.icon} ${a.label.toLowerCase()}`);
    }
    // The key is a local YYYY-MM-DD; `new Date(key)` would read it as UTC and
    // land on the previous evening in any western time zone.
    const [y, mo, d] = selected.split('-').map(Number);
    caption = `${formatDay(new Date(y, mo - 1, d))} · ${parts.length ? parts.join(' · ') : 'nothing logged'}`;
  } else if (stats.count === 0) {
    caption = `No waterings in the last ${win.phrase}.`;
  } else if (stats.gaps.length === 0) {
    caption = `1 watering in the last ${win.phrase}.`;
  } else {
    caption = `${stats.count} waterings · about every ${stats.medianGap}d · longest gap ${stats.maxGap}d`;
  }

  const showYear = (m) => m.first.getFullYear() !== months[0].first.getFullYear() || m === months[0];

  return (
    <div className="watering-chart care-calendar">
      <button className="chart-toggle" onClick={() => setExpanded(!expanded)}>
        <span>Watering Calendar</span>
        <span className={`chart-chevron ${expanded ? 'open' : ''}`}>&#9662;</span>
      </button>

      {expanded && (
        <div className="chart-body">
          <div className="chart-range-bar">
            {WINDOWS.map((w, i) => (
              <button
                key={w.label}
                className={`chart-range-btn ${i === winIdx ? 'active' : ''}`}
                onClick={() => { setWinIdx(i); setSelected(null); }}
              >
                {w.label}
              </button>
            ))}
          </div>

          <p className={`chart-avg cal-caption ${selected ? 'is-day' : ''}`}>{caption}</p>

          <div className={`cal-months ${months.length > 3 ? 'scroll' : ''}`}>
            {months.map((m) => (
              <div key={m.key} className="cal-month">
                <p className="cal-month-name">
                  {MONTHS[m.first.getMonth()]}{showYear(m) ? ` ${m.first.getFullYear()}` : ''}
                </p>
                <div className="cal-grid" role="grid">
                  {DOW.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
                  {Array.from({ length: m.lead }, (_, i) => <div key={`lead-${i}`} />)}
                  {m.days.map((d) => {
                    if (d.future) return <div key={d.key} className="cal-day future">{d.num}</div>;
                    const cls = [
                      'cal-day',
                      d.blank ? 'blank' : 'in',
                      d.water ? 'watered' : '',
                      d.care.length ? 'care' : '',
                      d.key === todayKey ? 'today' : '',
                      d.key === selected ? 'selected' : '',
                    ].filter(Boolean).join(' ');
                    return (
                      <button
                        key={d.key}
                        type="button"
                        className={cls}
                        onClick={() => setSelected(d.key === selected ? null : d.key)}
                        aria-label={formatDay(d.date)}
                      >
                        {d.num}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="heatmap-legend cal-legend">
            <span><i className="legend-watered" /> watered</span>
            <span><i className="legend-today" /> today</span>
            <span><i className="legend-dot" /> other care</span>
          </div>
        </div>
      )}
    </div>
  );
}
