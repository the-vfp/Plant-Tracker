import { useState, useEffect } from 'react';
import { db } from '../db.js';

const PLANT_EMOJIS = [
  '🌱', '🌿', '🍀', '🌵', '🌴', '🌳', '🌲', '🎋',
  '🪴', '🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🍃',
  '🌾', '🎄', '🍁', '🍂', '🥀', '☘️', '🪻', '🪷',
];

export default function AddPlant({ editId, onDone }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [icon, setIcon] = useState('🌱');
  const [customMode, setCustomMode] = useState(false);
  const [wateringInterval, setWateringInterval] = useState('7');

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
        }
      });
    }
  }, [editId]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const finalIcon = icon.trim() || '🌱';

    if (editId) {
      const interval = Math.max(1, parseInt(wateringInterval) || 7);
      await db.plants.update(editId, { name: trimmed, type: type.trim(), icon: finalIcon, wateringInterval: interval });
    } else {
      const interval = Math.max(1, parseInt(wateringInterval) || 7);
      await db.plants.add({ name: trimmed, type: type.trim(), icon: finalIcon, wateringInterval: interval, createdAt: new Date().toISOString() });
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

      <div className="form-group">
        <label htmlFor="watering-interval">Water Every (days)</label>
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
