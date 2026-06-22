// Care-schedule logic — generalizes the watering reminder to any recurring care
// task (water, fertilize, rotate). Shared by the home Tend tab and the plant
// detail "Care schedule" block so the due math stays identical across both.
//
// Watering keeps its own log table; fertilizing and rotation ride on notes,
// derived by emoji (🧪 = fertilized, 🔄 = rotated) — the same vocabulary the
// care log already uses (see careLog.js). No separate logging flow.

const DAY = 86400000;
const daysFloor = (ms) => Math.floor(ms / DAY);

// Per-task config. `field` is the per-plant interval (in days). Water always
// has a schedule (default 7); fert/rotation are opt-in — untracked until the
// plant sets an interval. `tone` drives urgency color: water overdue is a real
// problem (urgent), fert/rotation overdue just means slower growth (soft).
export const CARE_TASKS = [
  { key: 'water',  field: 'wateringInterval', icon: '💧', label: 'Water',     tone: 'urgent', defaultInterval: 7 },
  { key: 'fert',   field: 'fertInterval',     icon: '🧪', label: 'Fertilize', tone: 'soft', emoji: '🧪' },
  { key: 'rotate', field: 'rotateInterval',   icon: '🔄', label: 'Rotate',    tone: 'soft', emoji: '🔄' },
];

// Build last-done lookups for every care task from the raw logs.
// Returns { water: {plantId -> Date}, fert: {...}, rotate: {...} }.
export function buildLastDone(waterings, notes) {
  const maps = { water: {}, fert: {}, rotate: {} };
  for (const w of waterings) {
    const d = new Date(w.date);
    if (!maps.water[w.plantId] || d > maps.water[w.plantId]) maps.water[w.plantId] = d;
  }
  for (const n of notes) {
    const key = n.emoji === '🧪' ? 'fert' : n.emoji === '🔄' ? 'rotate' : null;
    if (!key) continue;
    const d = new Date(n.date);
    if (!maps[key][n.plantId] || d > maps[key][n.plantId]) maps[key][n.plantId] = d;
  }
  return maps;
}

// Schedule status for one plant's tracked tasks.
// Returns [{ key, icon, label, tone, emoji, interval, lastDone, dueIn }].
// dueIn = days until due (negative = overdue, NEGATIVE_INFINITY = never done).
// Only tasks with an interval set on the plant are included.
export function scheduleForPlant(plant, maps, nowMs = Date.now()) {
  const out = [];
  for (const t of CARE_TASKS) {
    const raw = Number(plant[t.field]);
    const interval = Number.isFinite(raw) && raw > 0 ? raw : t.defaultInterval;
    if (!interval) continue;
    const last = maps[t.key][plant.id] || null;
    const dueIn = last
      ? interval - daysFloor(nowMs - last.getTime())
      : Number.NEGATIVE_INFINITY;
    out.push({ key: t.key, icon: t.icon, label: t.label, tone: t.tone, emoji: t.emoji, interval, lastDone: last, dueIn });
  }
  return out;
}

// Short due label for task rows and schedule chips.
export function dueLabelShort(dueIn) {
  if (dueIn === Number.NEGATIVE_INFINITY) return 'due now';
  if (dueIn < 0) return `${-dueIn}d overdue`;
  if (dueIn === 0) return 'today';
  if (dueIn === 1) return 'in 1d';
  return `in ${dueIn}d`;
}
