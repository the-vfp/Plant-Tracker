import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import Lightbox from './Lightbox.jsx';
import HeaderActions from './HeaderActions.jsx';

const DAY = 86400000;

// Relative stamp anchored to when the plant was acquired (createdAt), so the
// timeline reads as a journey — "Day 1", "+3 weeks", "+5 months", "+1.5 years".
function relStamp(photoDate, acqDate) {
  const days = Math.floor((new Date(photoDate) - new Date(acqDate)) / DAY);
  if (days <= 0) return 'Day 1';
  if (days < 7) return `Day ${days + 1}`;
  // Weeks stay granular for the first ~3 months so clustered shots don't all
  // collapse to the same "+N months" label; months/years take over after.
  if (days < 84) {
    const w = Math.round(days / 7);
    return `+${w} ${w === 1 ? 'week' : 'weeks'}`;
  }
  if (days < 730) {
    const m = Math.round(days / 30.44);
    return `+${m} ${m === 1 ? 'month' : 'months'}`;
  }
  return `+${(days / 365).toFixed(1)} years`;
}

// How long you've had the plant — shown in the header subtitle.
function spanLabel(acqDate, nowMs) {
  const days = Math.floor((nowMs - new Date(acqDate)) / DAY);
  if (days < 14) return `${days} days`;
  if (days < 84) return `${Math.round(days / 7)} weeks`;
  if (days < 730) return `${Math.round(days / 30.44)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GrowthTimeline({ plantId, onBack, onSettings }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const plant = useLiveQuery(() => db.plants.get(plantId), [plantId]);
  const photos = useLiveQuery(
    () => db.photos.where('plantId').equals(plantId).toArray(),
    [plantId]
  );

  // One object URL per photo (full-size blob — photos are the star here),
  // reused for both the list image and the lightbox. Revoked on cleanup.
  const { ordered, objectUrls } = useMemo(() => {
    if (!photos) return { ordered: [], objectUrls: [] };
    const urls = [];
    const list = [...photos]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((p) => {
        const url = URL.createObjectURL(p.blob);
        urls.push(url);
        return { ...p, url };
      });
    return { ordered: list, objectUrls: urls };
  }, [photos]);

  useEffect(() => () => objectUrls.forEach((u) => URL.revokeObjectURL(u)), [objectUrls]);

  if (!plant || !photos) return <div className="loading">Loading...</div>;

  const acq = plant.createdAt;

  return (
    <div className="growth-view">
      <header className="growth-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to plant">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="growth-headtext">
          <div className="growth-title">{plant.icon || '🌱'} {plant.name} · Growth</div>
          <div className="growth-sub">
            {spanLabel(acq, Date.now())} · {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </div>
        </div>
        <HeaderActions onSettings={onSettings} />
      </header>

      <div className="growth-body">
        {ordered.length === 0 ? (
          <p className="empty-timeline">No photos yet. Add one from the plant page to start the timeline.</p>
        ) : (
          ordered.map((p, i) => (
            <div key={p.id} className="growth-row">
              <div className="growth-spine">
                {i < ordered.length - 1 && <span className="growth-line" />}
                <span className="growth-dot" />
              </div>
              <div className="growth-content">
                <div className="growth-stamp">
                  <span className="growth-rel">{relStamp(p.date, acq)}</span>
                  {i === ordered.length - 1 && ordered.length > 1 && (
                    <span className="growth-latest">Latest</span>
                  )}
                  <span className="growth-date">{formatDate(p.date)}</span>
                </div>
                <img
                  src={p.url}
                  alt={`${plant.name} on ${formatDate(p.date)}`}
                  className="growth-photo"
                  onClick={() => setLightboxUrl(p.url)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {lightboxUrl && <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
