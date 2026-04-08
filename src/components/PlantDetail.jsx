import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { processPhoto } from '../utils/imageCompression.js';
import Lightbox from './Lightbox.jsx';

export default function PlantDetail({ plantId, onEdit, onBack }) {
  const [noteText, setNoteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

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
      ...notes.map((n) => ({ type: 'note', date: n.date, text: n.text, id: `n-${n.id}`, noteId: n.id })),
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

  const addNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    await db.notes.add({ plantId, text, date: new Date().toISOString() });
    setNoteText('');
  };

  const deleteWatering = async (wateringId) => {
    await db.waterings.delete(wateringId);
  };

  const deleteNote = async (noteId) => {
    await db.notes.delete(noteId);
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

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="plant-detail">
      <div className="detail-header">
        <span className="detail-icon">{plant.icon || '🌱'}</span>
        <h2>{plant.name}</h2>
        {plant.type && <p className="detail-type">{plant.type}</p>}
        <div className="detail-actions">
          <button className="btn-secondary" onClick={() => onEdit(plantId)}>Edit</button>
          <button className="btn-danger" onClick={deletePlant}>Delete</button>
        </div>
      </div>

      <button className="water-btn-large" onClick={waterPlant}>
        💧 Water Now
      </button>

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
      </div>

      <div className="note-input">
        <input
          type="text"
          placeholder="Add a note... (repotted, fertilized, etc.)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
        />
        <button className="btn-primary" onClick={addNote}>Add</button>
      </div>

      <div className="timeline">
        <h3>Care Log</h3>
        {timeline.length === 0 ? (
          <p className="empty-timeline">No activity yet.</p>
        ) : (
          timeline.map((entry) => (
            <div key={entry.id} className={`timeline-entry ${entry.type}`}>
              <span className="timeline-icon">
                {entry.type === 'water' ? '💧' : entry.type === 'note' ? '📝' : '📷'}
              </span>
              <div className="timeline-content">
                {entry.type === 'photo' ? (
                  <img
                    src={entry.thumbnailUrl}
                    alt="Plant photo"
                    className="timeline-thumbnail"
                    onClick={() => openLightbox(entry.photoBlob)}
                  />
                ) : (
                  <span className="timeline-text">
                    {entry.type === 'water' ? 'Watered' : entry.text}
                  </span>
                )}
                <span className="timeline-date">{formatDate(entry.date)}</span>
              </div>
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
          ))
        )}
      </div>

      {lightboxUrl && <Lightbox src={lightboxUrl} onClose={closeLightbox} />}
    </div>
  );
}
