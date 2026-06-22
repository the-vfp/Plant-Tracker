import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { NOTE_KIND, ACTION } from '../careLog.js';

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const HELP_URL = 'https://quartz-the-vfp.vercel.app/Help-Center/';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysFloor(ms) {
  return Math.floor(ms / 86400000);
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayNr = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayNr + 3);
  const firstThursday = d.valueOf();
  d.setMonth(0, 1);
  if (d.getDay() !== 4) {
    d.setMonth(0, 1 + ((4 - d.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - d) / 604800000);
}

export default function Home({ onSelect, onAdd, onSettings }) {
  const plants = useLiveQuery(() => db.plants.toArray());
  const waterings = useLiveQuery(() => db.waterings.toArray());
  const notes = useLiveQuery(() => db.notes.toArray());

  const [tab, setTab] = useState('thirsty');
  const [selectedDay, setSelectedDay] = useState(null);

  const photos = useLiveQuery(() => db.photos.toArray());

  if (!plants || !waterings || !notes || !photos) return <div className="loading">Loading…</div>;

  const now = new Date();
  const today = startOfDay(now);

  const lastWateredByPlant = {};
  for (const w of waterings) {
    const d = new Date(w.date);
    const existing = lastWateredByPlant[w.plantId];
    if (!existing || d > existing) lastWateredByPlant[w.plantId] = d;
  }

  const plantsWithDue = plants.map((p) => {
    const last = lastWateredByPlant[p.id];
    const interval = p.wateringInterval || 7;
    let dueIn;
    if (!last) {
      dueIn = Number.NEGATIVE_INFINITY;
    } else {
      const daysSinceWater = daysFloor(Date.now() - last.getTime());
      dueIn = interval - daysSinceWater;
    }
    return { ...p, dueIn, lastWatered: last };
  });

  // Resting (dead) plants keep their history but drop out of every
  // watering view — reminders, the week strip, and the headline counts.
  const alivePlants = plantsWithDue.filter((p) => p.status !== 'dead');

  const thirsty = alivePlants
    .filter((p) => p.dueIn <= 0)
    .sort((a, b) => a.dueIn - b.dueIn);

  const scheduledByDay = Array.from({ length: 7 }, (_, i) =>
    alivePlants.filter((p) => p.dueIn === i)
  );

  const waterPlant = async (plantId) => {
    await db.waterings.add({ plantId, date: new Date().toISOString() });
  };

  const plantById = Object.fromEntries(plants.map((p) => [p.id, p]));
  const feed = [
    ...waterings.map((w) => ({
      id: `w-${w.id}`,
      kind: 'water',
      plantId: w.plantId,
      date: w.date,
      text: null,
      emoji: null,
    })),
    ...notes.map((n) => ({
      id: `n-${n.id}`,
      kind: NOTE_KIND[n.emoji] || 'note',
      plantId: n.plantId,
      date: n.date,
      text: n.text,
      emoji: n.emoji,
    })),
    ...photos.map((p) => ({
      id: `p-${p.id}`,
      kind: 'photo',
      plantId: p.plantId,
      date: p.date,
      text: null,
      emoji: null,
    })),
  ]
    .filter((e) => plantById[e.plantId])
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const weekNumber = getISOWeek(today);
  const monthYear = `${MONTH_ABBR[today.getMonth()].toUpperCase()} '${String(today.getFullYear()).slice(2)}`;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return {
      weekday: WEEKDAY[d.getDay()],
      dateNum: d.getDate(),
    };
  });

  return (
    <div className="ledger">
      <div className="ledger-head">
        <a
          className="ledger-help"
          href={HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Help Center"
          title="Help Center"
        >
          ?
        </a>
        <button
          className="ledger-settings"
          onClick={onSettings}
          aria-label="Settings"
        >
          ⚙️
        </button>
        <div className="ledger-eyebrow">WK {weekNumber} · {monthYear}</div>
        <h1 className="ledger-title">My Plants</h1>
        <div className="ledger-sub">
          {thirsty.length} thirsty · {alivePlants.length} total
        </div>
      </div>

      <div className="ledger-week">
        <div className="week-header">
          <span className="eyebrow">The week ahead</span>
        </div>

        <div className="week-strip">
          <div className="week-axis" />
          {weekDays.map((d, i) => {
            const dayPlants = scheduledByDay[i];
            const hasPlants = dayPlants.length > 0;
            const active = selectedDay === i;
            return (
              <button
                key={i}
                className={`week-day ${active ? 'active' : ''}`}
                onClick={() => setSelectedDay(active ? null : i)}
              >
                <div className={`day-dot ${hasPlants ? 'filled' : ''}`}>{d.dateNum}</div>
                <div className="day-label">{d.weekday}</div>
                <OverflowGlyph plants={dayPlants} />
              </button>
            );
          })}
        </div>

        {selectedDay !== null && (
          <div className="week-drawer">
            <div className="drawer-head">
              {weekDays[selectedDay].weekday} · {scheduledByDay[selectedDay].length} to water
            </div>
            <div className="drawer-pills">
              {scheduledByDay[selectedDay].length === 0 ? (
                <div className="drawer-empty">Nothing scheduled.</div>
              ) : (
                scheduledByDay[selectedDay].map((p) => (
                  <button
                    key={p.id}
                    className="day-pill"
                    onClick={() => onSelect(p.id)}
                  >
                    <span className="pill-emoji">{p.icon || '🌱'}</span>
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="ledger-tabs">
        {[
          ['thirsty', 'Thirsty'],
          ['feed', 'Care log'],
          ['all', 'All plants'],
        ].map(([k, l]) => (
          <button
            key={k}
            className={`tab-btn ${tab === k ? 'active' : ''}`}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="ledger-content">
        {tab === 'thirsty' && (
          <ThirstyList plants={thirsty} onWater={waterPlant} onSelect={onSelect} />
        )}
        {tab === 'feed' && (
          <CareFeed feed={feed} plantById={plantById} onSelect={onSelect} />
        )}
        {tab === 'all' && (
          <AllPlantsList plants={plantsWithDue} onSelect={onSelect} onWater={waterPlant} />
        )}
      </div>

      {tab === 'all' && (
        <button className="fab" onClick={onAdd} aria-label="Add plant">+</button>
      )}
    </div>
  );
}

function OverflowGlyph({ plants }) {
  const n = plants.length;
  if (n === 0) return <div className="glyph-empty" />;
  const shown = n <= 2 ? plants : plants.slice(0, 1);
  const extra = n - shown.length;
  return (
    <div className="glyph-stack">
      {shown.map((p, i) => (
        <span
          key={p.id}
          className="glyph-emoji"
          style={{ marginLeft: i === 0 ? 0 : -6 }}
        >
          {p.icon || '🌱'}
        </span>
      ))}
      {extra > 0 && <span className="glyph-pill">+{extra}</span>}
    </div>
  );
}

function dueLabel(dueIn) {
  if (dueIn === Number.NEGATIVE_INFINITY) return 'Never watered';
  if (dueIn < 0) return `${-dueIn}d overdue`;
  if (dueIn === 0) return 'Today';
  if (dueIn === 1) return 'Tomorrow';
  return `In ${dueIn}d`;
}

function PlantRow({ plant, primarySub, primaryTone, secondarySub, onWater, onSelect, resting }) {
  return (
    <div className={`plant-row ${resting ? 'resting' : ''}`} onClick={() => onSelect(plant.id)}>
      <div className="plant-row-emoji">{plant.icon || '🌱'}</div>
      <div className="plant-row-info">
        <div className="plant-row-name">{plant.name}</div>
        {primarySub && (
          <div className={`plant-row-sub ${primaryTone ? `tone-${primaryTone}` : ''}`}>
            {primarySub}
          </div>
        )}
        {secondarySub && <div className="plant-row-meta">{secondarySub}</div>}
      </div>
      {resting ? (
        <span className="plant-row-headstone" aria-hidden="true">🪦</span>
      ) : (
        <button
          className="plant-row-water"
          onClick={(e) => {
            e.stopPropagation();
            onWater(plant.id);
          }}
          aria-label={`Water ${plant.name}`}
        >
          💧
        </button>
      )}
    </div>
  );
}

function ThirstyList({ plants, onWater, onSelect }) {
  if (plants.length === 0) {
    return <div className="ledger-empty">Nothing thirsty. 🌿</div>;
  }
  return (
    <div className="plant-list">
      {plants.map((p) => (
        <PlantRow
          key={p.id}
          plant={p}
          primarySub={dueLabel(p.dueIn)}
          primaryTone="urgent"
          onWater={onWater}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function formatFeedDate(dateStr) {
  const d = new Date(dateStr);
  const today = startOfDay(new Date());
  const entryDay = startOfDay(d);
  const diff = daysFloor(today.getTime() - entryDay.getTime());
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Yesterday · ${time}`;
  if (diff < 7) return `${WEEKDAY[d.getDay()]} · ${time}`;
  return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
}

const FEED_PAGE_SIZE = 20;

function CareFeed({ feed, plantById, onSelect }) {
  const [visible, setVisible] = useState(FEED_PAGE_SIZE);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisible(FEED_PAGE_SIZE);
  }, [feed.length]);

  useEffect(() => {
    if (!sentinelRef.current || visible >= feed.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + FEED_PAGE_SIZE, feed.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visible, feed.length]);

  if (feed.length === 0) {
    return <div className="ledger-empty">No care logged yet.</div>;
  }

  const items = feed.slice(0, visible);
  return (
    <div className="feed-list">
      {items.map((e) => {
        const plant = plantById[e.plantId];
        if (!plant) return null;
        const a = ACTION[e.kind] || ACTION.note;
        const bubbleGlyph = e.kind === 'note' && e.emoji ? e.emoji : a.icon;
        return (
          <div
            key={e.id}
            className={`feed-row tone-${a.tone}`}
            onClick={() => onSelect(plant.id)}
          >
            <div className="feed-bubble">{bubbleGlyph}</div>
            <div className="feed-body">
              <div className="feed-head">
                <span className="feed-label">{a.label}</span>
                <span className="feed-plant">
                  <span className="feed-plant-emoji">{plant.icon || '🌱'}</span>
                  {plant.name}
                </span>
              </div>
              <div className="feed-when">{formatFeedDate(e.date)}</div>
              {e.text && <div className="feed-note">&ldquo;{e.text}&rdquo;</div>}
            </div>
          </div>
        );
      })}
      {visible < feed.length && <div ref={sentinelRef} className="feed-sentinel" />}
    </div>
  );
}

const SORT_OPTIONS = [
  ['date', 'Date acquired'],
  ['name', 'Name'],
  ['type', 'Type'],
];

const STATUS_FILTERS = [
  ['all', 'All'],
  ['alive', 'Alive'],
  ['resting', 'Resting'],
];

function restedLabel(diedAt) {
  if (!diedAt) return 'Resting';
  const d = new Date(diedAt);
  return `Resting since ${MONTH_ABBR[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function sortPlants(plants, mode) {
  const copy = [...plants];
  if (mode === 'name') {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (mode === 'type') {
    return copy.sort((a, b) => {
      const ta = a.type || '\uFFFF';
      const tb = b.type || '\uFFFF';
      return ta.localeCompare(tb);
    });
  }
  return copy.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function AllPlantsList({ plants, onSelect, onWater }) {
  const [sortMode, setSortMode] = useState('date');
  const [statusFilter, setStatusFilter] = useState('alive');

  if (plants.length === 0) {
    return (
      <div className="empty-state">
        <p>No plants yet!</p>
        <p>Add your first plant to start tracking.</p>
      </div>
    );
  }

  const visible = plants.filter((p) =>
    statusFilter === 'all'
      ? true
      : statusFilter === 'resting'
        ? p.status === 'dead'
        : p.status !== 'dead'
  );
  const sorted = sortPlants(visible, sortMode);

  return (
    <div className="all-plants">
      <div className="sort-bar status-filter">
        {STATUS_FILTERS.map(([k, l]) => (
          <button
            key={k}
            className={`sort-btn ${statusFilter === k ? 'active' : ''}`}
            onClick={() => setStatusFilter(k)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="sort-bar">
        {SORT_OPTIONS.map(([k, l]) => (
          <button
            key={k}
            className={`sort-btn ${sortMode === k ? 'active' : ''}`}
            onClick={() => setSortMode(k)}
          >
            {l}
          </button>
        ))}
      </div>
      {sorted.length === 0 ? (
        <div className="ledger-empty">
          {statusFilter === 'resting'
            ? 'The graveyard is empty. 🌿'
            : 'No living plants here.'}
        </div>
      ) : (
        <div className="plant-list">
          {sorted.map((p) => {
            const isResting = p.status === 'dead';
            if (isResting) {
              return (
                <PlantRow
                  key={p.id}
                  plant={p}
                  primarySub={p.type}
                  secondarySub={restedLabel(p.diedAt)}
                  onSelect={onSelect}
                  resting
                />
              );
            }
            const days = p.lastWatered
              ? daysFloor(Date.now() - p.lastWatered.getTime())
              : null;
            const daysText =
              days === null
                ? 'Never watered'
                : days === 0
                  ? 'Watered today'
                  : days === 1
                    ? '1 day ago'
                    : `${days} days ago`;
            return (
              <PlantRow
                key={p.id}
                plant={p}
                primarySub={p.type}
                secondarySub={daysText}
                onWater={onWater}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
