import { useState, useMemo } from 'react';
import { NOTE_KIND, ACTION } from '../careLog.js';
import { startOfDay, dayKey, wateringStats } from '../careStats.js';

// Watering Calendar — a GitHub-style heatmap of one plant's care, one square
// per day, columns are weeks (Mon→Sun top to bottom). Fill = waterings that
// day; a small dot = some other logged care (fertilize, rotate, repot…).
// Complements the Watering Cadence bars above it: the bars answer "how many
// days between drinks", this answers "what did the last few months look like".

const WINDOWS = [
  { label: '1 mo', months: 1, phrase: 'month' },
  { label: '3 mo', months: 3, phrase: '3 months' },
  { label: '6 mo', months: 6, phrase: '6 months' },
  { label: '1 yr', months: 12, phrase: 'year' },
];

const DAY = 86_400_000;
const SVG_W = 400;
const PAD_LEFT = 22; // room for the M / W / F row labels
const PAD_TOP = 14;  // room for month labels
const GAP = 2;
const MAX_CELL = 24;
const ROW_LABELS = ['M', '', 'W', '', 'F', '', ''];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function mondayOf(input) {
  const d = startOfDay(input);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function fillFor(water) {
  if (water >= 2) return 'var(--cactus)';
  if (water === 1) return 'var(--leaf)';
  return 'var(--pot-fill)';
}

function formatDay(d) {
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CareHeatmap({ waterings, notes, createdAt, now }) {
  const [expanded, setExpanded] = useState(true);
  const [winIdx, setWinIdx] = useState(1);
  const [selected, setSelected] = useState(null);
  const win = WINDOWS[winIdx];

  const { weeks, cells, stats } = useMemo(() => {
    const today = startOfDay(now);
    // Window = the `months` calendar months ending today, inclusive.
    const windowStart = new Date(today);
    windowStart.setMonth(windowStart.getMonth() - win.months);
    windowStart.setDate(windowStart.getDate() + 1);
    const gridStart = mondayOf(windowStart);
    const weeks = Math.round((mondayOf(today) - gridStart) / (7 * DAY)) + 1;

    const byDay = {};
    for (const w of waterings || []) {
      const k = dayKey(w.date);
      (byDay[k] ||= { water: 0, care: [] }).water++;
    }
    for (const n of notes || []) {
      const kind = NOTE_KIND[n.emoji];
      if (!kind) continue; // plain 📝 notes aren't "care"
      const k = dayKey(n.date);
      const slot = (byDay[k] ||= { water: 0, care: [] });
      if (!slot.care.includes(kind)) slot.care.push(kind);
    }

    const born = createdAt ? startOfDay(createdAt).getTime() : -Infinity;
    const cells = [];
    for (let wk = 0; wk < weeks; wk++) {
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + wk * 7 + dow);
        if (d > today) continue;
        const k = dayKey(d);
        cells.push({
          key: k, wk, dow, date: d,
          faint: d < windowStart || d.getTime() < born,
          firstOfMonth: d.getDate() === 1,
          ...(byDay[k] || { water: 0, care: [] }),
        });
      }
    }

    const windowDays = Math.round((today - startOfDay(windowStart)) / DAY) + 1;
    return { weeks, cells, stats: wateringStats(waterings, windowDays, now) };
  }, [waterings, notes, createdAt, now, win.months]);

  const cell = Math.min(MAX_CELL, Math.floor((SVG_W - PAD_LEFT - GAP * (weeks - 1)) / weeks));
  const gridW = weeks * cell + (weeks - 1) * GAP;
  const offsetX = PAD_LEFT + (SVG_W - PAD_LEFT - gridW) / 2;
  const svgH = PAD_TOP + 7 * cell + 6 * GAP + 2;
  const fontSize = cell >= 14 ? 9 : 8;

  const monthLabels = cells.filter((c) => c.firstOfMonth && c.wk > 0);

  const selectedCell = selected ? cells.find((c) => c.key === selected) : null;
  let caption;
  if (selectedCell) {
    const parts = [];
    if (selectedCell.water) parts.push(selectedCell.water > 1 ? `💧 watered ×${selectedCell.water}` : '💧 watered');
    for (const kind of selectedCell.care) {
      const a = ACTION[kind];
      if (a) parts.push(`${a.icon} ${a.label.toLowerCase()}`);
    }
    caption = `${formatDay(selectedCell.date)} · ${parts.length ? parts.join(' · ') : 'nothing logged'}`;
  } else if (stats.count === 0) {
    caption = `No waterings in the last ${win.phrase}.`;
  } else if (stats.gaps.length === 0) {
    caption = `1 watering in the last ${win.phrase}.`;
  } else {
    caption = `${stats.count} waterings · about every ${stats.medianGap}d · longest gap ${stats.maxGap}d`;
  }

  return (
    <div className="watering-chart care-heatmap">
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

          <svg viewBox={`0 0 ${SVG_W} ${svgH}`} className="chart-svg heatmap-svg" role="img" aria-label="Watering calendar">
            {ROW_LABELS.map((lbl, row) => lbl && (
              <text
                key={row}
                x={offsetX - 6}
                y={PAD_TOP + row * (cell + GAP) + cell / 2 + 3}
                textAnchor="end"
                fontSize={fontSize}
                fill="var(--text-muted)"
              >
                {lbl}
              </text>
            ))}

            {monthLabels.map((c) => (
              <text
                key={`m-${c.key}`}
                x={offsetX + c.wk * (cell + GAP)}
                y={PAD_TOP - 4}
                fontSize={fontSize}
                fill="var(--text-muted)"
              >
                {MONTHS[c.date.getMonth()]}
              </text>
            ))}

            {cells.map((c) => {
              const x = offsetX + c.wk * (cell + GAP);
              const y = PAD_TOP + c.dow * (cell + GAP);
              const isSel = c.key === selected;
              return (
                <g
                  key={c.key}
                  opacity={c.faint ? 0.35 : 1}
                  onClick={() => setSelected(isSel ? null : c.key)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={x} y={y} width={cell} height={cell}
                    rx={Math.min(5, cell / 4)}
                    fill={fillFor(c.water)}
                    stroke={isSel ? 'var(--ink)' : 'none'}
                    strokeWidth={isSel ? 1.5 : 0}
                  />
                  {c.care.length > 0 && (
                    <circle
                      cx={x + cell / 2} cy={y + cell / 2}
                      r={Math.max(1.2, cell * 0.14)}
                      fill="var(--ink)" opacity="0.6"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          <p className={`chart-avg heatmap-caption ${selectedCell ? 'is-day' : ''}`}>{caption}</p>

          <div className="heatmap-legend">
            <span><i style={{ background: 'var(--pot-fill)' }} /> dry day</span>
            <span><i style={{ background: 'var(--leaf)' }} /> watered</span>
            <span><i style={{ background: 'var(--cactus)' }} /> twice+</span>
            <span><i className="legend-dot" /> other care</span>
          </div>
        </div>
      )}
    </div>
  );
}
