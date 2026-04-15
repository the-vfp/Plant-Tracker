import { useState, useMemo } from 'react';

const RANGES = [
  { label: 'Last 10', count: 10 },
  { label: 'Last 20', count: 20 },
  { label: 'All', count: Infinity },
];

const SVG_WIDTH = 400;
const SVG_HEIGHT = 140;
const PADDING = { top: 20, right: 16, bottom: 28, left: 34 };

function computeIntervals(waterings, count) {
  if (!waterings || waterings.length < 2) return [];

  const sorted = [...waterings]
    .map((w) => new Date(w.date))
    .sort((a, b) => a - b);

  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24);
    intervals.push({ date: sorted[i], days: Math.round(days * 10) / 10 });
  }

  if (count < Infinity) {
    return intervals.slice(-count);
  }
  return intervals;
}

function formatLabel(date) {
  const m = date.toLocaleDateString('en-CA', { month: 'short' });
  const d = date.getDate();
  return `${m} ${d}`;
}

export default function WateringChart({ waterings }) {
  const [expanded, setExpanded] = useState(false);
  const [rangeIndex, setRangeIndex] = useState(0);

  const range = RANGES[rangeIndex];
  const intervals = useMemo(
    () => computeIntervals(waterings, range.count),
    [waterings, range.count]
  );

  const maxDays = Math.max(1, ...intervals.map((d) => d.days));
  const avgDays = intervals.length > 0
    ? Math.round((intervals.reduce((s, d) => s + d.days, 0) / intervals.length) * 10) / 10
    : 0;

  const chartW = SVG_WIDTH - PADDING.left - PADDING.right;
  const chartH = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  const barGap = Math.max(1, Math.min(3, chartW / intervals.length * 0.15));
  const barWidth = intervals.length > 0
    ? Math.max(2, (chartW - barGap * (intervals.length - 1)) / intervals.length)
    : 0;

  const bars = intervals.map((d, i) => ({
    x: PADDING.left + i * (barWidth + barGap),
    height: Math.max(2, (d.days / maxDays) * chartH),
    days: d.days,
    date: d.date,
  }));

  // Y-axis ticks — pick sensible round numbers
  const yTickCount = Math.min(5, Math.ceil(maxDays));
  const yStep = maxDays <= 5 ? 1 : Math.ceil(maxDays / yTickCount);
  const yTicks = [];
  for (let v = 0; v <= maxDays; v += yStep) yTicks.push(v);
  if (yTicks[yTicks.length - 1] < maxDays) yTicks.push(Math.ceil(maxDays));

  // X-axis labels — ~5-7 evenly spaced
  const labelInterval = Math.max(1, Math.floor(intervals.length / 6));
  const xLabels = bars.filter((_, i) => i % labelInterval === 0 || i === bars.length - 1);

  const hasData = waterings && waterings.length >= 2;

  // Average line y position
  const avgY = PADDING.top + chartH - (avgDays / maxDays) * chartH;

  return (
    <div className="watering-chart">
      <button className="chart-toggle" onClick={() => setExpanded(!expanded)}>
        <span>Watering Cadence</span>
        <span className={`chart-chevron ${expanded ? 'open' : ''}`}>&#9662;</span>
      </button>

      {expanded && (
        <div className="chart-body">
          <div className="chart-range-bar">
            {RANGES.map((r, i) => (
              <button
                key={r.label}
                className={`chart-range-btn ${i === rangeIndex ? 'active' : ''}`}
                onClick={() => setRangeIndex(i)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {!hasData ? (
            <p className="chart-empty">Need at least 2 waterings to show cadence.</p>
          ) : intervals.length === 0 ? (
            <p className="chart-empty">No intervals in this range.</p>
          ) : (
            <>
              <p className="chart-avg">avg {avgDays}d between waterings</p>
              <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="chart-svg">
                {/* Y-axis grid lines */}
                {yTicks.map((tick) => {
                  const y = PADDING.top + chartH - (tick / maxDays) * chartH;
                  return (
                    <g key={tick}>
                      <line
                        x1={PADDING.left}
                        y1={y}
                        x2={SVG_WIDTH - PADDING.right}
                        y2={y}
                        stroke="var(--sage-pale)"
                        strokeWidth="0.5"
                      />
                      <text
                        x={PADDING.left - 6}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="9"
                        fill="var(--text-muted)"
                      >
                        {tick}d
                      </text>
                    </g>
                  );
                })}

                {/* Average line */}
                <line
                  x1={PADDING.left}
                  y1={avgY}
                  x2={SVG_WIDTH - PADDING.right}
                  y2={avgY}
                  stroke="var(--sage)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  opacity="0.6"
                />

                {/* Bars */}
                {bars.map((b, i) => (
                  <rect
                    key={i}
                    x={b.x}
                    y={PADDING.top + chartH - b.height}
                    width={barWidth}
                    height={b.height}
                    rx={Math.min(2, barWidth / 2)}
                    fill="var(--sage)"
                    opacity={0.85}
                  />
                ))}

                {/* X-axis labels */}
                {xLabels.map((b, i) => (
                  <text
                    key={i}
                    x={b.x + barWidth / 2}
                    y={SVG_HEIGHT - 4}
                    textAnchor="middle"
                    fontSize="8"
                    fill="var(--text-muted)"
                  >
                    {formatLabel(b.date)}
                  </text>
                ))}
              </svg>
            </>
          )}
        </div>
      )}
    </div>
  );
}
