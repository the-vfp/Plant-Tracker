// "Copy for Claude" — turns the raw tables (plants, waterings, notes, photos)
// into one Markdown document shaped for *reading*: names instead of plantId
// foreign keys, schedules next to what actually happened, overdue items first,
// recent notes last. The backup JSON is for machines; this is for a chat.
//
// Nothing here touches the DOM or the database — Settings.jsx fetches the
// tables and hands them in, so this stays trivially testable.

import { NOTE_KIND, ACTION } from './careLog.js';
import { buildLastDone, scheduleForPlant, dueLabelShort } from './careSchedule.js';
import { wateringStats, cadenceVerdict, calendarDaysBetween } from './careStats.js';

const WINDOW_DAYS = 90;
const RECENT_NOTES = 5;
const NOTE_CHARS = 240;

const fmtDate = (d) => new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

// dueLabelShort is tuned for chips ("today", "in 3d"); in prose it needs its verb.
function dueText(dueIn) {
  const l = dueLabelShort(dueIn);
  return l === 'today' || l.startsWith('in ') ? `due ${l}` : l;
}

function ago(d, nowMs) {
  const n = calendarDaysBetween(d, nowMs);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n}d ago`;
}

function span(days) {
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 70) return `${Math.round(days / 7)} weeks`;
  if (days < 700) return `${Math.round(days / 30.44)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

function groupBy(rows, field) {
  const out = {};
  for (const r of rows || []) (out[r[field]] ||= []).push(r);
  return out;
}

function noteLine(n) {
  const kind = NOTE_KIND[n.emoji] || 'note';
  const a = ACTION[kind] || ACTION.note;
  const glyph = n.emoji || a.icon;
  const text = (n.text || '').replace(/\s+/g, ' ').trim();
  const clipped = text.length > NOTE_CHARS ? `${text.slice(0, NOTE_CHARS - 1)}…` : text;
  return `${fmtShort(n.date)} · ${glyph} ${a.label.toLowerCase()}${clipped ? ` · ${clipped}` : ''}`;
}

function plantBlock(p, { maps, waterings, notes, photos, now }) {
  const resting = p.status === 'dead';
  const lines = [];
  lines.push(`### ${p.icon || '🌱'} ${p.name}${p.type ? ` — ${p.type}` : ''}`);

  if (resting) {
    const lived = p.createdAt && p.diedAt ? span(calendarDaysBetween(p.createdAt, p.diedAt)) : null;
    lines.push(`- Resting${p.diedAt ? ` since ${fmtDate(p.diedAt)}` : ''}${lived ? ` · was in the collection ${lived}` : ''}`);
  } else {
    const since = p.createdAt ? ` · in the collection since ${fmtDate(p.createdAt)} (${span(calendarDaysBetween(p.createdAt, now))})` : '';
    lines.push(`- Alive${since}`);

    const sched = scheduleForPlant(p, maps, now).map((t) => {
      const last = t.lastDone ? `last ${fmtShort(t.lastDone)} (${ago(t.lastDone, now)})` : 'never logged';
      return `${t.icon} ${t.label.toLowerCase()} every ${t.interval}d — ${last}, ${dueText(t.dueIn)}`;
    });
    if (sched.length) lines.push(`- Schedule: ${sched.join('; ')}`);

    const s = wateringStats(waterings, WINDOW_DAYS, now);
    const allTime = (waterings || []).length;
    if (s.count === 0) {
      lines.push(`- Watering, last ${WINDOW_DAYS} days: none logged${allTime ? ` (${allTime} all-time)` : ''}`);
    } else if (s.gaps.length === 0) {
      lines.push(`- Watering, last ${WINDOW_DAYS} days: 1 watering (${fmtShort(s.last)})${allTime > 1 ? ` · ${allTime} all-time` : ''}`);
    } else {
      const range = s.minGap === s.maxGap ? '' : ` (${s.minGap}–${s.maxGap}d)`;
      const verdict = cadenceVerdict(Number(p.wateringInterval) || 7, s.medianGap);
      lines.push(`- Watering, last ${WINDOW_DAYS} days: ${s.count} waterings, actually ~${s.medianGap}d apart${range}${verdict ? ` → ${verdict}` : ''}`);
    }
  }

  if (photos.length) {
    const latest = photos.reduce((m, ph) => (new Date(ph.date) > new Date(m.date) ? ph : m));
    lines.push(`- Photos: ${photos.length}, latest ${fmtShort(latest.date)}`);
  }

  const pinned = notes.filter((n) => n.pinned && (n.text || '').trim());
  for (const n of pinned) lines.push(`- 📌 Pinned: ${noteLine(n)}`);

  const recent = notes
    .filter((n) => !n.pinned)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, RECENT_NOTES);
  if (recent.length) {
    lines.push('- Recent notes:');
    for (const n of recent) lines.push(`  - ${noteLine(n)}`);
  }

  lines.push('');
  return lines;
}

export function buildContext({ plants, waterings, notes, photos = [], now = Date.now() }) {
  const alive = plants.filter((p) => p.status !== 'dead');
  const resting = plants.filter((p) => p.status === 'dead');
  const maps = buildLastDone(waterings, notes);
  const W = groupBy(waterings, 'plantId');
  const N = groupBy(notes, 'plantId');
  const P = groupBy(photos, 'plantId');
  const ctx = (p) => ({ maps, waterings: W[p.id] || [], notes: N[p.id] || [], photos: P[p.id] || [], now });

  const lines = [];
  lines.push('# Plant Tracker — context for Claude', '');
  lines.push(
    `Exported ${fmtDate(now)} from the Plant Tracker app. ${plants.length} plant${plants.length === 1 ? '' : 's'}: `
    + `${alive.length} alive, ${resting.length} resting (in the graveyard). Dates are local. `
    + `"every Nd" is the schedule set in the app; "actually ~Nd" is the median gap between real waterings over the last ${WINDOW_DAYS} days.`,
    '',
  );

  const due = [];
  for (const p of alive) {
    for (const t of scheduleForPlant(p, maps, now)) if (t.dueIn <= 0) due.push({ p, t });
  }
  due.sort((a, b) => a.t.dueIn - b.t.dueIn);
  lines.push('## Needs attention');
  if (!due.length) lines.push('Nothing is due or overdue right now.');
  for (const { p, t } of due) {
    const last = t.lastDone ? ` (last ${fmtShort(t.lastDone)})` : ' (never logged)';
    lines.push(`- ${t.icon} ${p.name}: ${t.label.toLowerCase()} ${dueText(t.dueIn)}${last}`);
  }
  lines.push('');

  lines.push('## Plants', '');
  const byName = (a, b) => a.name.localeCompare(b.name);
  for (const p of [...alive].sort(byName)) lines.push(...plantBlock(p, ctx(p)));

  if (resting.length) {
    lines.push('## Resting', '');
    for (const p of [...resting].sort(byName)) lines.push(...plantBlock(p, ctx(p)));
  }

  lines.push('## Vocabulary');
  lines.push(Object.values(ACTION).map((a) => `${a.icon} ${a.label.toLowerCase()}`).join(' · '));
  lines.push('');
  return lines.join('\n');
}
