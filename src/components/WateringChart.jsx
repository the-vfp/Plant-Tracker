import { useState, useMemo } from 'react';

const RANGES = [
  { label: '14d', days: 14, bucketSize: 1 },
  { label: '30d', days: 30, bucketSize: 1 },
  { label: '90d', days: 90, bucketSize: 2 },
  { label: '360d', days: 360, bucketSize: 3 },
];

const SVG_WIDTH = 400;
const SVG_HEIGHT = 140;
const PADDING = { top: 20, right: 16, bottom: 28, left: 28 };

function bucketWaterings(waterings, days, bucketSize) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const bucketCount = Math.ceil(days / bucketSize);
  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(bucketStart.getDate() + i * bucketSize);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketEnd.getDate() + bucketSize);
    return { start: bucketStart, end: bucketEnd, count: 0 };
  });

  for (const w of waterings) {
    const d = new Date(w.date);
    if (d < start) continue;
    const dayOffset = Math.floor((d - start) / (1000 * 60 * 60 * 24));
    const bucketIndex = Math.min(Math.floor(dayOffset / bucketSize), bucketCount - 1);
    if (bucketIndex >= 0) buckets[bucketIndex].count++;
  }

  return buckets;
}

function formatLabel(date, days) {
  const m = date.toLocaleDateString('en-CA', { month: 'short' });
  const d = date.getDate();
  if (days <= 30) return `${m} ${d}`;
  return m;
}

export default function WateringChart({ waterings }) {
  const [expanded, setExpanded] = useState(false);
  const [rangeIndex, setRangeIndex] = useState(0);

  const range = RANGES[rangeIndex];
  const buckets = useMemo(
    () => bucketWaterings(waterings || [], range.days, range.bucketSize),
    [waterings, range.days, range.bucketSize]
  );

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const yTicks = Array.from({ length: maxCount + 1 }, (_, i) => i);

  const chartW = SVG_WIDTH - PADDING.left - PADDING.right;
  const chartH = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  const barGap = 1;
  const barWidth = Math.max(1, (chartW - barGap * (buckets.length - 1)) / buckets.length);

  const bars = buckets.map((b, i) => ({
    x: PADDING.left + i * (barWidth + barGap),
    height: b.count > 0 ? Math.max(2, (b.count / maxCount) * chartH) : 0,
    count: b.count,
    date: b.start,
  }));

  // Pick ~5-7 evenly spaced x-axis labels
  const labelInterval = Math.max(1, Math.floor(buckets.length / 6));
  const xLabels = bars.filter((_, i) => i % labelInterval === 0 || i === bars.length - 1);

  const hasData = waterings && waterings.length > 0;
  const hasDataInRange = buckets.some((b) => b.count > 0);

  return (
    <div className="watering-chart">
      <button className="chart-toggle" onClick={() => setExpanded(!expanded)}>
        <span>Watering History</span>
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

          {!hasData || !hasDataInRange ? (
            <p className="chart-empty">No waterings in this range.</p>
          ) : (
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="chart-svg">
              {/* Y-axis grid lines */}
              {yTicks.map((tick) => {
                const y = PADDING.top + chartH - (tick / maxCount) * chartH;
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
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {bars.map((b, i) => (
                b.count > 0 && (
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
                )
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
                  {formatLabel(b.date, range.days)}
                </text>
              ))}
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
