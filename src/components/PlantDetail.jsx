import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';

export default function PlantDetail({ plantId, onEdit, onBack }) {
  const [noteText, setNoteText] = useState('');

  const plant = useLiveQuery(() => db.plants.get(plantId), [plantId]);
  const waterings = useLiveQuery(
    () => db.waterings.where('plantId').equals(plantId).toArray(),
    [plantId]
  );
  const notes = useLiveQuery(
    () => db.notes.where('plantId').equals(plantId).toArray(),
    [plantId]
  );

  if (!plant || !waterings || !notes) return <div className="loading">Loading...</div>;

  const timeline = [
    ...waterings.map((w) => ({ type: 'water', date: w.date, id: `w-${w.id}` })),
    ...notes.map((n) => ({ type: 'note', date: n.date, text: n.text, id: `n-${n.id}`, noteId: n.id })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const waterPlant = async () => {
    await db.waterings.add({ plantId, date: new Date().toISOString() });
  };

  const addNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    await db.notes.add({ plantId, text, date: new Date().toISOString() });
    setNoteText('');
  };

  const deleteNote = async (noteId) => {
    await db.notes.delete(noteId);
  };

  const deletePlant = async () => {
    if (!confirm(`Delete "${plant.name}"? This removes all its data.`)) return;
    await db.waterings.where('plantId').equals(plantId).delete();
    await db.notes.where('plantId').equals(plantId).delete();
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
                {entry.type === 'water' ? '💧' : '📝'}
              </span>
              <div className="timeline-content">
                <span className="timeline-text">
                  {entry.type === 'water' ? 'Watered' : entry.text}
                </span>
                <span className="timeline-date">{formatDate(entry.date)}</span>
              </div>
              {entry.type === 'note' && (
                <button
                  className="delete-note-btn"
                  onClick={() => deleteNote(entry.noteId)}
                  aria-label="Delete note"
                >
                  &times;
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
