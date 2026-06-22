import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { NOTE_KIND, ACTION, entryGlyph, cycleFilter, passesFilter } from '../careLog.js';
import { buildLastDone, scheduleForPlant, dueLabelShort } from '../careSchedule.js';
import { processPhoto } from '../utils/imageCompression.js';
import Lightbox from './Lightbox.jsx';
import WateringChart from './WateringChart.jsx';
import EmojiFilter from './EmojiFilter.jsx';

const NOTE_EMOJIS = [
  { emoji: '🧪', label: 'Fertilizer' },
  { emoji: '🪴', label: 'Repotting' },
  { emoji: '✂️', label: 'Pruning' },
  { emoji: '🔄', label: 'Rotation' },
  { emoji: '📦', label: 'Moving' },
  { emoji: '🌱', label: 'Propagation' },
  { emoji: '🐛', label: 'Pest control' },
];

export default function PlantDetail({ plantId, onEdit, onBack, onViewGrowth }) {
  const [noteText, setNoteText] = useState('');
  const [noteEmoji, setNoteEmoji] = useState(null);
  const [customEmojiMode, setCustomEmojiMode] = useState(false);
  const [customEmojiText, setCustomEmojiText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [logFilters, setLogFilters] = useState({});

  const plant = useLiveQuery(() => db.plants.get(plantId), [plantId]);
  const waterings = useLiveQuery(
    () => db.waterings.where('plantId').equals(plantId).toArray(),
    [plantId]
  );
  const notes = useLiveQuery(
    () => db.notes.where('plantId').equals(plantId).toArray(),
    [plantId]
  );
  const photos = useLiveQuery(
    () => db.photos.where('plantId').equals(plantId).toArray(),
    [plantId]
  );

  // Build timeline with object URLs for photo thumbnails
  const { timeline, objectUrls } = useMemo(() => {
    if (!waterings || !notes || !photos) return { timeline: [], objectUrls: [] };

    const urls = [];
    const entries = [
      ...waterings.map((w) => ({ type: 'water', date: w.date, id: `w-${w.id}`, wateringId: w.id })),
      ...notes.map((n) => ({ type: 'note', date: n.date, text: n.text, emoji: n.emoji || '📝', pinned: !!n.pinned, id: `n-${n.id}`, noteId: n.id })),
      ...photos.map((p) => {
        const thumbnailUrl = URL.createObjectURL(p.thumbnail);
        urls.push(thumbnailUrl);
        return {
          type: 'photo',
          date: p.date,
          id: `p-${p.id}`,
          photoId: p.id,
          thumbnailUrl,
          photoBlob: p.blob,
        };
      }),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return { timeline: entries, objectUrls: urls };
  }, [waterings, notes, photos]);

  // Revoke thumbnail object URLs on cleanup
  useEffect(() => {
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [objectUrls]);

  // Revoke lightbox URL when closing
  const openLightbox = (photoBlob) => {
    setLightboxUrl(URL.createObjectURL(photoBlob));
  };
  const closeLightbox = () => {
    if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
    setLightboxUrl(null);
  };

  if (!plant || !waterings || !notes || !photos) return <div className="loading">Loading...</div>;

  const waterPlant = async () => {
    await db.waterings.add({ plantId, date: new Date().toISOString() });
  };

  const getSelectedEmoji = () => {
    if (customEmojiMode && customEmojiText.trim()) return customEmojiText.trim();
    return noteEmoji || '📝';
  };

  const resetNoteForm = () => {
    setNoteText('');
    setNoteEmoji(null);
    setCustomEmojiMode(false);
    setCustomEmojiText('');
    setEditingNoteId(null);
  };

  const addNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    const emoji = getSelectedEmoji();
    if (editingNoteId) {
      await db.notes.update(editingNoteId, { text, emoji });
      resetNoteForm();
    } else {
      await db.notes.add({ plantId, text, emoji, date: new Date().toISOString() });
      resetNoteForm();
    }
  };

  const startEditNote = (entry) => {
    setEditingNoteId(entry.noteId);
    setNoteText(entry.text);
    const emoji = entry.emoji || '📝';
    const presetMatch = NOTE_EMOJIS.find(e => e.emoji === emoji);
    if (presetMatch) {
      setNoteEmoji(emoji);
      setCustomEmojiMode(false);
      setCustomEmojiText('');
    } else if (emoji !== '📝') {
      setNoteEmoji(null);
      setCustomEmojiMode(true);
      setCustomEmojiText(emoji);
    } else {
      setNoteEmoji(null);
      setCustomEmojiMode(false);
      setCustomEmojiText('');
    }
  };

  const deleteWatering = async (wateringId) => {
    await db.waterings.delete(wateringId);
  };

  const deleteNote = async (noteId) => {
    await db.notes.delete(noteId);
  };

  const togglePin = async (noteId, pinned) => {
    await db.notes.update(noteId, { pinned: !pinned });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { blob, thumbnail, mimeType } = await processPhoto(file);
      await db.photos.add({
        plantId,
        date: new Date().toISOString(),
        blob,
        thumbnail,
        mimeType,
      });
    } catch (err) {
      alert('Failed to process photo.');
      console.error(err);
    }
    setUploading(false);
    e.target.value = '';
  };

  const deletePhoto = async (photoId) => {
    if (!confirm('Delete this photo?')) return;
    await db.photos.delete(photoId);
  };

  const deletePlant = async () => {
    if (!confirm(`Delete "${plant.name}"? This removes all its data.`)) return;
    await db.waterings.where('plantId').equals(plantId).delete();
    await db.notes.where('plantId').equals(plantId).delete();
    await db.photos.where('plantId').equals(plantId).delete();
    await db.plants.delete(plantId);
    onBack();
  };

  const layToRest = async () => {
    if (!confirm(`Lay "${plant.name}" to rest in the graveyard? Its history is kept, and you can revive it anytime.`)) return;
    await db.plants.update(plantId, { status: 'dead', diedAt: new Date().toISOString() });
    onBack();
  };

  const revive = async () => {
    await db.plants.update(plantId, { status: 'alive', diedAt: null });
  };

  const isResting = plant.status === 'dead';
  const restingSince = plant.diedAt
    ? new Date(plant.diedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
  };

  // This plant's care calendar — interval + next-due for each tracked task.
  // Resting plants drop out of reminders, so no schedule for them.
  const schedule = isResting ? [] : scheduleForPlant(plant, buildLastDone(waterings, notes), Date.now());

  // Pinned notes float into their own group at the top; everything else stays chronological.
  const pinnedNotes = timeline.filter((e) => e.type === 'note' && e.pinned);
  const chronological = timeline.filter((e) => !(e.type === 'note' && e.pinned));

  // Emoji filter for the chronological Care Log (pinned notes stay curated/visible).
  const logGlyphs = [];
  for (const e of chronological) {
    const g = entryGlyph(e.type, e.emoji);
    if (!logGlyphs.includes(g)) logGlyphs.push(g);
  }
  const filteredChrono = chronological.filter((e) =>
    passesFilter(entryGlyph(e.type, e.emoji), logFilters)
  );

  const renderRow = (entry) => {
    const kind = entry.type === 'note' ? (NOTE_KIND[entry.emoji] || 'note') : entry.type;
    const a = ACTION[kind] || ACTION.note;
    const glyph = entry.type === 'note' ? (entry.emoji || a.icon) : a.icon;
    return (
      <div key={entry.id} className={`feed-row tone-${a.tone} ${entry.pinned ? 'is-pinned' : ''}`}>
        <div className="feed-bubble">{glyph}</div>
        <div className="feed-body">
          <div className="feed-head">
            <span className="feed-label">{a.label}</span>
          </div>
          <div className="feed-when">{formatDate(entry.date)}</div>
          {entry.type === 'photo' && (
            <img
              src={entry.thumbnailUrl}
              alt="Plant photo"
              className="timeline-thumbnail"
              onClick={() => openLightbox(entry.photoBlob)}
            />
          )}
          {entry.type === 'note' && entry.text && (
            <div className="feed-note">&ldquo;{entry.text}&rdquo;</div>
          )}
        </div>
        <div className="timeline-actions">
          {entry.type === 'note' && (
            <button
              className={`pin-note-btn ${entry.pinned ? 'pinned' : ''}`}
              onClick={() => togglePin(entry.noteId, entry.pinned)}
              aria-label={entry.pinned ? 'Unpin note' : 'Pin note'}
              aria-pressed={entry.pinned}
              title={entry.pinned ? 'Unpin note' : 'Pin note'}
            >
              📌
            </button>
          )}
          {entry.type === 'note' && (
            <button
              className="edit-note-btn"
              onClick={() => startEditNote(entry)}
              aria-label="Edit note"
            >
              ✏️
            </button>
          )}
          <button
            className="delete-note-btn"
            onClick={() =>
              entry.type === 'water' ? deleteWatering(entry.wateringId) :
              entry.type === 'note' ? deleteNote(entry.noteId) :
              deletePhoto(entry.photoId)
            }
            aria-label={`Delete ${entry.type}`}
          >
            &times;
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="plant-detail">
      <div className="detail-header">
        <span className="detail-icon">{plant.icon || '🌱'}</span>
        <h2>{plant.name}</h2>
        {plant.type && <p className="detail-type">{plant.type}</p>}
        {isResting && (
          <div className="detail-resting-banner">
            🪦 Resting{restingSince ? ` since ${restingSince}` : ''}
          </div>
        )}
        <div className="detail-actions">
          <button className="btn-secondary" onClick={() => onEdit(plantId)}>Edit</button>
          {isResting ? (
            <button className="btn-revive" onClick={revive}>🌱 Revive</button>
          ) : (
            <button className="btn-rest" onClick={layToRest}>🪦 Lay to rest</button>
          )}
          <button className="btn-danger" onClick={deletePlant}>Delete</button>
        </div>
      </div>

      {schedule.length > 0 && (
        <div className="care-schedule">
          <h3>Care schedule</h3>
          {schedule.map((t) => (
            <div key={t.key} className={`sched-row tone-${t.tone}`}>
              <span className="sched-icon">{t.icon}</span>
              <span className="sched-label">{t.label}</span>
              <span className="sched-interval">every {t.interval}d</span>
              <span className="sched-next">{dueLabelShort(t.dueIn)}</span>
            </div>
          ))}
        </div>
      )}

      {!isResting && (
        <button className="water-btn-large" onClick={waterPlant}>
          💧 Water Now
        </button>
      )}

      <div className="photo-upload">
        <label className={`btn-secondary photo-btn ${uploading ? 'uploading' : ''}`}>
          {uploading ? '⏳ Processing...' : '📷 Add Photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />
        </label>
        {photos.length >= 2 && (
          <button className="btn-secondary photo-btn growth-btn" onClick={onViewGrowth}>
            📸 See growth →
          </button>
        )}
      </div>

      <WateringChart waterings={waterings} />

      <div className="note-input-section">
        <div className="note-emoji-picker">
          {NOTE_EMOJIS.map(({ emoji, label }) => (
            <button
              key={emoji}
              className={`emoji-btn-sm ${noteEmoji === emoji && !customEmojiMode ? 'selected' : ''}`}
              onClick={() => {
                if (noteEmoji === emoji && !customEmojiMode) {
                  setNoteEmoji(null);
                } else {
                  setNoteEmoji(emoji);
                  setCustomEmojiMode(false);
                  setCustomEmojiText('');
                }
              }}
              title={label}
            >
              {emoji}
            </button>
          ))}
          {customEmojiMode ? (
            <input
              type="text"
              className="custom-emoji-input"
              value={customEmojiText}
              onChange={(e) => {
                setCustomEmojiText(e.target.value);
                setNoteEmoji(null);
              }}
              placeholder="😀"
              autoFocus
            />
          ) : (
            <button
              className="emoji-btn-sm custom-trigger"
              onClick={() => {
                setCustomEmojiMode(true);
                setNoteEmoji(null);
              }}
              title="Custom emoji"
            >
              ⌨️
            </button>
          )}
        </div>
        <div className="note-input">
          <input
            type="text"
            placeholder="Add a note... (repotted, fertilized, etc.)"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
          />
          <button className="btn-primary" onClick={addNote}>
            {editingNoteId ? 'Save' : 'Add'}
          </button>
          {editingNoteId && (
            <button className="btn-secondary" onClick={resetNoteForm}>Cancel</button>
          )}
        </div>
      </div>

      <div className="timeline">
        {pinnedNotes.length > 0 && (
          <div className="timeline-pinned">
            <h3>📌 Pinned</h3>
            {pinnedNotes.map(renderRow)}
          </div>
        )}
        <h3>Care Log</h3>
        <EmojiFilter
          glyphs={logGlyphs}
          filters={logFilters}
          onCycle={(g) => setLogFilters((f) => cycleFilter(f, g))}
          onClear={() => setLogFilters({})}
        />
        {chronological.length === 0 ? (
          <p className="empty-timeline">
            {pinnedNotes.length > 0 ? 'No other activity yet.' : 'No activity yet.'}
          </p>
        ) : filteredChrono.length === 0 ? (
          <p className="empty-timeline">No matching entries.</p>
        ) : (
          filteredChrono.map(renderRow)
        )}
      </div>

      {lightboxUrl && <Lightbox src={lightboxUrl} onClose={closeLightbox} />}
    </div>
  );
}
