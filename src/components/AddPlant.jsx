import { useState, useEffect } from 'react';
import { db } from '../db.js';

const PLANT_EMOJIS = [
  '🌱', '🌿', '🍀', '🪴', '🌵',
  '🌴', '🌸', '🌻', '🪻',
];

export default function AddPlant({ editId, onDone }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [icon, setIcon] = useState('🌱');
  const [customMode, setCustomMode] = useState(false);
  const [wateringInterval, setWateringInterval] = useState('7');
  const [fertInterval, setFertInterval] = useState('');
  const [rotateInterval, setRotateInterval] = useState('');

  useEffect(() => {
    if (editId) {
      db.plants.get(editId).then((plant) => {
        if (plant) {
          setName(plant.name);
          setType(plant.type || '');
          const loadedIcon = plant.icon || '🌱';
          setIcon(loadedIcon);
          setCustomMode(!PLANT_EMOJIS.includes(loadedIcon));
          setWateringInterval(String(plant.wateringInterval || 7));
          setFertInterval(plant.fertInterval ? String(plant.fertInterval) : '');
          setRotateInterval(plant.rotateInterval ? String(plant.rotateInterval) : '');
        }
      });
    }
  }, [editId]);

  // Optional schedules: blank (or invalid) means "no reminder" → stored as null.
  const parseOptional = (v) => {
    const n = parseInt(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const finalIcon = icon.trim() || '🌱';
    const interval = Math.max(1, parseInt(wateringInterval) || 7);
    const fields = {
      name: trimmed,
      type: type.trim(),
      icon: finalIcon,
      wateringInterval: interval,
      fertInterval: parseOptional(fertInterval),
      rotateInterval: parseOptional(rotateInterval),
    };

    if (editId) {
      await db.plants.update(editId, fields);
    } else {
      await db.plants.add({ ...fields, createdAt: new Date().toISOString() });
    }
    onDone();
  };

  return (
    <div className="add-plant">
      <div className="form-group">
        <label htmlFor="plant-name">Plant Name</label>
        <input
          id="plant-name"
          type="text"
          placeholder="e.g. Monstera, Pothos..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="plant-type">Plant Type</label>
        <input
          id="plant-type"
          type="text"
          placeholder="e.g. Golden Pothos, Snake Plant..."
          value={type}
          onChange={(e) => setType(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      </div>

      <div className="form-section-label">Care schedule</div>

      <div className="schedule-row">
        <div className="form-group">
          <label htmlFor="watering-interval">💧 Water (days)</label>
          <input
            id="watering-interval"
            type="number"
            min="1"
            max="365"
            value={wateringInterval}
            onChange={(e) => setWateringInterval(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fert-interval">🧪 Fertilize (days)</label>
          <input
            id="fert-interval"
            type="number"
            min="1"
            max="365"
            placeholder="Off"
            value={fertInterval}
            onChange={(e) => setFertInterval(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>

        <div className="form-group">
          <label htmlFor="rotate-interval">🔄 Rotate (days)</label>
          <input
            id="rotate-interval"
            type="number"
            min="1"
            max="365"
            placeholder="Off"
            value={rotateInterval}
            onChange={(e) => setRotateInterval(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
      </div>
      <p className="form-hint">Leave fertilize or rotate blank for no reminder.</p>

      <div className="form-group">
        <label>Icon</label>
        <div className="emoji-picker">
          {PLANT_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className={`emoji-btn ${icon === emoji && !customMode ? 'selected' : ''}`}
              onClick={() => { setIcon(emoji); setCustomMode(false); }}
            >
              {emoji}
            </button>
          ))}
          {customMode ? (
            <input
              type="text"
              className="custom-emoji-input"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="😀"
              aria-label="Custom emoji"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="emoji-btn custom-trigger"
              onClick={() => { setCustomMode(true); setIcon(''); }}
              title="Custom emoji"
              aria-label="Use a custom emoji"
            >
              ⌨️
            </button>
          )}
        </div>
      </div>

      <button className="btn-primary save-btn" onClick={save}>
        {editId ? 'Save Changes' : 'Add Plant'}
      </button>
    </div>
  );
}
