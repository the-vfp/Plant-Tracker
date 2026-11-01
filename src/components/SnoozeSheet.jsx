import { useEffect, useRef, useState } from 'react';
import { pushOverlay } from '../useScreenHistory.js';
import { calendarDaysBetween } from '../careStats.js';
import { snoozeUntil } from '../careSchedule.js';

const DONE_LABEL = { water: '💧 Watered it', fert: '🧪 Fertilized it', rotate: '🔄 Rotated it', pest: '🐛 Treated it' };
const LAST_VERB = { water: 'watered', fert: 'fertilized', rotate: 'rotated', pest: 'treated' };
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MAX_DAYS = 60;

// Bottom sheet from holding a Tend ✓: log it after all, or check back in any
// number of days. Opens on the last pick for this plant and task (1 the first time).
// Like the lightbox, it's a history step, so the back gesture closes it.
export default function SnoozeSheet({ plant, task, now, onDone, onSnooze, onClose }) {
  const [days, setDays] = useState(() => plant.snoozeDays?.[task.key] || 1);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    pushOverlay();
    const onPop = () => onCloseRef.current();
    const handleKey = (e) => {
      if (e.key === 'Escape') window.history.back();
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);
  const close = () => window.history.back();

  const until = snoozeUntil(days, now);
  const dayName = days === 1 ? 'tomorrow' : WEEKDAY[until.getDay()];
  const ago = task.lastDone ? calendarDaysBetween(task.lastDone, now) : null;
  const hint = [
    ago === null
      ? `Never ${LAST_VERB[task.key]}`
      : `Last ${LAST_VERB[task.key]} ${ago === 0 ? 'today' : ago === 1 ? 'yesterday' : `${ago} days ago`}`,
    `every ${task.interval} days`,
  ].join(' · ');

  return (
    <div className="sheet-overlay" onClick={close}>
      <div className="snooze-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${plant.name} · ${task.label}`}>
        <div className="sheet-grab" />
        <h3 className="sheet-title">
          <span>{plant.icon || '🌱'}</span> {plant.name} · {task.label}
        </h3>
        <p className="sheet-hint">{hint}</p>

        <button
          className="sheet-done"
          onClick={() => {
            onDone();
            close();
          }}
        >
          {DONE_LABEL[task.key]}
        </button>

        <div className="sheet-or">Not yet? Check back in…</div>
        <div className="snooze-stepper">
          <button
            className="snooze-step"
            onClick={() => setDays((d) => Math.max(1, d - 1))}
            disabled={days <= 1}
            aria-label="One day fewer"
          >
            −
          </button>
          <div className="snooze-count" aria-live="polite">
            <span className="snooze-num">{days}</span> {days === 1 ? 'day' : 'days'}
            <small>
              {WEEKDAY[until.getDay()]}, {MONTH[until.getMonth()]} {until.getDate()}
            </small>
          </div>
          <button
            className="snooze-step"
            onClick={() => setDays((d) => Math.min(MAX_DAYS, d + 1))}
            disabled={days >= MAX_DAYS}
            aria-label="One day more"
          >
            +
          </button>
        </div>
        <button
          className="sheet-snooze"
          onClick={() => {
            onSnooze(days);
            close();
          }}
        >
          💤 Check back {dayName}
        </button>
      </div>
    </div>
  );
}
