import { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { NOTE_KIND, ACTION, entryGlyph, cycleFilter, passesFilter } from '../careLog.js';
import { CARE_TASKS, buildLastDone, scheduleForPlant, dueLabelShort, activeSnooze, snoozeUntil, snoozeWhen } from '../careSchedule.js';
import EmojiFilter from './EmojiFilter.jsx';
import SnoozeSheet from './SnoozeSheet.jsx';
import { HELP_URL } from './HeaderActions.jsx';
import { useNow } from '../useNow.js';
import { calendarDaysBetween } from '../careStats.js';

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

export default function Home({ tab, onTab: setTab, onSelect, onAdd, onSettings }) {
  const plants = useLiveQuery(() => db.plants.toArray());
  const waterings = useLiveQuery(() => db.waterings.toArray());
  const notes = useLiveQuery(() => db.notes.toArray());

  const [selectedDay, setSelectedDay] = useState(null);
  const [sheet, setSheet] = useState(null); // { plant, task } while the snooze sheet is open

  const photos = useLiveQuery(() => db.photos.toArray());
  const now = useNow();

  if (!plants || !waterings || !notes || !photos) return <div className="loading">Loading…</div>;

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
    // A snoozed plant sits on its check-back day instead of its due day.
    const snooze = activeSnooze(p, 'water', last, now);
    let dueIn;
    if (snooze) {
      dueIn = snooze.days;
    } else if (!last) {
      dueIn = Number.NEGATIVE_INFINITY;
    } else {
      const daysSinceWater = calendarDaysBetween(last, now);
      dueIn = interval - daysSinceWater;
    }
    return { ...p, dueIn, lastWatered: last, snooze };
  });

  // Resting (dead) plants keep their history but drop out of every
  // watering view — reminders, the week strip, and the headline counts.
  const alivePlants = plantsWithDue.filter((p) => p.status !== 'dead');

  // The week strip stays watering-only — water is the daily heartbeat.
  // Check-backs sort first so a crowded day still shows its 💤.
  const scheduledByDay = Array.from({ length: 7 }, (_, i) =>
    alivePlants.filter((p) => p.dueIn === i).sort((a, b) => !!b.snooze - !!a.snooze)
  );

  // The Tend tab covers every care task (water + opt-in fert/rotation),
  // grouped per plant so tasks you do together stay together.
  const careMaps = buildLastDone(waterings, notes);
  const tendGroups = [];
  const snoozed = []; // the "Checking back" strip under Tend, soonest first
  for (const p of alivePlants) {
    const schedule = scheduleForPlant(p, careMaps, now);
    const tasks = schedule
      .filter((t) => t.dueIn <= 0)
      .sort((a, b) => a.dueIn - b.dueIn);
    const worst = tasks.reduce((m, t) => Math.min(m, t.dueIn), Infinity);
    if (tasks.length > 0) tendGroups.push({ plant: p, tasks, worst });
    for (const t of schedule) if (t.snooze) snoozed.push({ plant: p, task: t });
  }
  tendGroups.sort((a, b) => a.worst - b.worst);
  snoozed.sort((a, b) => a.task.dueIn - b.task.dueIn);

  const waterPlant = async (plantId) => {
    await db.waterings.add({ plantId, date: new Date().toISOString() });
  };

  // One-tap "tended": water logs to its table; fert/rotation/pest log a note with
  // the matching emoji (no text), consistent with the care-log vocabulary.
  const logTask = async (plantId, taskKey) => {
    if (taskKey === 'water') {
      await db.waterings.add({ plantId, date: new Date().toISOString() });
    } else {
      const emoji = CARE_TASKS.find((t) => t.key === taskKey)?.emoji;
      if (!emoji) return;
      await db.notes.add({ plantId, text: '', emoji, date: new Date().toISOString(), pinned: false });
    }
  };

  // Snoozing isn't care, so nothing is logged — it only moves the task's next
  // day. The pick is remembered per plant and task for next time.
  const snoozeTask = async (plant, taskKey, days) => {
    await db.plants.update(plant.id, {
      snoozes: { ...plant.snoozes, [taskKey]: { until: snoozeUntil(days).toISOString(), at: new Date().toISOString() } },
      snoozeDays: { ...plant.snoozeDays, [taskKey]: days },
    });
  };

  const wakeTask = async (plant, taskKey) => {
    const rest = { ...plant.snoozes };
    delete rest[taskKey];
    await db.plants.update(plant.id, { snoozes: rest });
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
          {tendGroups.length} to tend · {alivePlants.length} total
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
              {weekDays[selectedDay].weekday} · {drawerCount(scheduledByDay[selectedDay])}
            </div>
            <div className="drawer-pills">
              {scheduledByDay[selectedDay].length === 0 ? (
                <div className="drawer-empty">Nothing scheduled.</div>
              ) : (
                scheduledByDay[selectedDay].map((p) => (
                  <button
                    key={p.id}
                    className={`day-pill ${p.snooze ? 'snoozed' : ''}`}
                    onClick={() => onSelect(p.id)}
                  >
                    <span className="pill-emoji">{p.icon || '🌱'}</span>
                    {p.name}
                    {p.snooze && <span className="pill-zz" aria-label="checking back">💤</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="ledger-tabs">
        {[
          ['tend', 'Tend'],
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
        {tab === 'tend' && (
          <>
            <TendList
              groups={tendGroups}
              onLog={logTask}
              onHold={(plant, task) => setSheet({ plant, task })}
              onSelect={onSelect}
            />
            <SnoozedStrip items={snoozed} onWake={wakeTask} onSelect={onSelect} />
          </>
        )}
        {tab === 'feed' && (
          <CareFeed feed={feed} plantById={plantById} onSelect={onSelect} />
        )}
        {tab === 'all' && (
          <AllPlantsList plants={plantsWithDue} onSelect={onSelect} onWater={waterPlant} now={now} />
        )}
      </div>

      {tab === 'all' && (
        <button className="fab" onClick={onAdd} aria-label="Add plant">+</button>
      )}

      {sheet && (
        <SnoozeSheet
          plant={sheet.plant}
          task={sheet.task}
          now={now}
          onDone={() => logTask(sheet.plant.id, sheet.task.key)}
          onSnooze={(days) => snoozeTask(sheet.plant, sheet.task.key, days)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

// "2 to water", "1 to check", or both — snoozed plants are check-backs.
function drawerCount(dayPlants) {
  const check = dayPlants.filter((p) => p.snooze).length;
  const water = dayPlants.length - check;
  const parts = [];
  if (water || !check) parts.push(`${water} to water`);
  if (check) parts.push(`${check} to check`);
  return parts.join(' · ');
}

function SnoozedStrip({ items, onWake, onSelect }) {
  if (items.length === 0) return null;
  return (
    <div className="snoozed-strip">
      <div className="snoozed-head">
        <span>💤 Checking back</span>
        <span className="snoozed-count">{items.length}</span>
      </div>
      {items.map(({ plant, task }) => (
        <div key={`${plant.id}-${task.key}`} className="snoozed-row" onClick={() => onSelect(plant.id)}>
          <span className="snoozed-emoji">{plant.icon || '🌱'}</span>
          <span className="snoozed-name">
            {plant.name}
            {task.key !== 'water' && <span className="snoozed-task"> · {task.icon} {task.label.toLowerCase()}</span>}
          </span>
          <span className="snoozed-when">{snoozeWhen(task.snooze.until, task.snooze.days)}</span>
          <button
            className="snoozed-wake"
            onClick={(e) => {
              e.stopPropagation();
              onWake(plant, task.key);
            }}
            aria-label={`Bring ${plant.name} back to Tend now`}
          >
            wake
          </button>
        </div>
      ))}
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
          {p.snooze && <span className="glyph-zz" aria-hidden="true">💤</span>}
        </span>
      ))}
      {extra > 0 && <span className="glyph-pill">+{extra}</span>}
    </div>
  );
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

const HOLD_MS = 450;

// Tap logs the task; hold (or right-click) opens the snooze sheet instead.
// Android fires contextmenu on a long-press and iOS doesn't, so both the timer
// and the contextmenu event open it, and whichever comes first swallows the tap.
function TendDoButton({ plant, task, onLog, onHold }) {
  const timer = useRef(null);
  const held = useRef(false);
  const start = useRef(null);

  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
  };
  const hold = () => {
    cancel();
    if (held.current) return;
    held.current = true;
    navigator.vibrate?.(15);
    onHold(plant, task);
  };

  return (
    <button
      className="tend-task-do"
      onPointerDown={(e) => {
        held.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = setTimeout(hold, HOLD_MS);
      }}
      onPointerMove={(e) => {
        // a scroll that started on the button isn't a hold
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => {
        e.preventDefault();
        hold();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (held.current) {
          held.current = false;
          return;
        }
        onLog(plant.id, task.key);
      }}
      aria-label={`Mark ${task.label.toLowerCase()} done for ${plant.name} (hold to check back later)`}
      title={`Mark ${task.label.toLowerCase()} done · hold to check back later`}
    >
      ✓
    </button>
  );
}

// One due task → a simple row (like the old Thirsty list). Two or more → a card
// that groups the tasks under the plant, so things you do together stay together.
function TendList({ groups, onLog, onHold, onSelect }) {
  if (groups.length === 0) {
    return <div className="ledger-empty">All tended. 🌿</div>;
  }
  return (
    <div className="tend-list">
      {groups.map((g) =>
        g.tasks.length === 1 ? (
          <div key={g.plant.id} className="plant-row" onClick={() => onSelect(g.plant.id)}>
            <div className="plant-row-emoji">{g.plant.icon || '🌱'}</div>
            <div className="plant-row-info">
              <div className="plant-row-name">{g.plant.name}</div>
              <div className={`plant-row-sub tone-${g.tasks[0].tone}`}>
                {g.tasks[0].icon} {g.tasks[0].label} · {dueLabelShort(g.tasks[0].dueIn)}
              </div>
            </div>
            <TendDoButton plant={g.plant} task={g.tasks[0]} onLog={onLog} onHold={onHold} />
          </div>
        ) : (
          <div key={g.plant.id} className="tend-group">
            <button className="tend-plant" onClick={() => onSelect(g.plant.id)}>
              <span className="tend-plant-emoji">{g.plant.icon || '🌱'}</span>
              <span className="tend-plant-name">{g.plant.name}</span>
            </button>
            <div className="tend-tasks">
              {g.tasks.map((t) => (
                <div key={t.key} className={`tend-task tone-${t.tone}`}>
                  <span className="tend-task-icon">{t.icon}</span>
                  <span className="tend-task-label">{t.label}</span>
                  <span className="tend-task-due">{dueLabelShort(t.dueIn)}</span>
                  <TendDoButton plant={g.plant} task={t} onLog={onLog} onHold={onHold} />
                </div>
              ))}
            </div>
          </div>
        )
      )}
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
  const [filters, setFilters] = useState({});
  const [visible, setVisible] = useState(FEED_PAGE_SIZE);
  const sentinelRef = useRef(null);

  // Distinct glyphs present, newest-first (feed is already sorted), for the chips.
  const glyphs = useMemo(() => {
    const seen = [];
    for (const e of feed) {
      const g = entryGlyph(e.kind, e.emoji);
      if (!seen.includes(g)) seen.push(g);
    }
    return seen;
  }, [feed]);

  const shown = useMemo(
    () => feed.filter((e) => passesFilter(entryGlyph(e.kind, e.emoji), filters)),
    [feed, filters]
  );

  // Reset paging whenever the filtered list changes size. Adjusting state
  // during render (React's own recommendation) instead of a setState inside
  // an effect, which re-rendered the feed twice on every filter tap.
  const [pagedFor, setPagedFor] = useState(shown.length);
  if (pagedFor !== shown.length) {
    setPagedFor(shown.length);
    setVisible(FEED_PAGE_SIZE);
  }

  useEffect(() => {
    if (!sentinelRef.current || visible >= shown.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + FEED_PAGE_SIZE, shown.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visible, shown.length]);

  if (feed.length === 0) {
    return <div className="ledger-empty">No care logged yet.</div>;
  }

  const items = shown.slice(0, visible);
  return (
    <>
      <EmojiFilter
        glyphs={glyphs}
        filters={filters}
        onCycle={(g) => setFilters((f) => cycleFilter(f, g))}
        onClear={() => setFilters({})}
      />
      {shown.length === 0 ? (
        <div className="ledger-empty">No matching entries.</div>
      ) : (
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
          {visible < shown.length && <div ref={sentinelRef} className="feed-sentinel" />}
        </div>
      )}
    </>
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

function AllPlantsList({ plants, onSelect, onWater, now }) {
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
              ? calendarDaysBetween(p.lastWatered, now)
              : null;
            const daysText =
              days === null
                ? 'Never watered'
                : days === 0
                  ? 'Watered today'
                  : days === 1
                    ? '1 day ago'
                    : `${days} days ago`;
            const snoozeText = p.snooze ? ` · 💤 back ${snoozeWhen(p.snooze.until, p.snooze.days)}` : '';
            return (
              <PlantRow
                key={p.id}
                plant={p}
                primarySub={p.type}
                secondarySub={daysText + snoozeText}
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
