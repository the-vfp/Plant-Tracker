import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import PlantCard from './PlantCard.jsx';

export default function Home({ onSelect, onAdd }) {
  const plants = useLiveQuery(() => db.plants.toArray());
  const waterings = useLiveQuery(() => db.waterings.toArray());

  if (!plants || !waterings) return <div className="loading">Loading...</div>;

  const lastWatered = (plantId) => {
    const pw = waterings
      .filter((w) => w.plantId === plantId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return pw.length > 0 ? pw[0].date : null;
  };

  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const waterPlant = async (plantId) => {
    await db.waterings.add({ plantId, date: new Date().toISOString() });
  };

  return (
    <div className="home">
      {plants.length === 0 ? (
        <div className="empty-state">
          <p>No plants yet!</p>
          <p>Add your first plant to start tracking.</p>
        </div>
      ) : (
        <div className="plant-grid">
          {plants.map((plant) => {
            const last = lastWatered(plant.id);
            const days = daysSince(last);
            return (
              <PlantCard
                key={plant.id}
                plant={plant}
                daysSinceWatered={days}
                onWater={() => waterPlant(plant.id)}
                onSelect={() => onSelect(plant.id)}
              />
            );
          })}
        </div>
      )}
      <button className="fab" onClick={onAdd} aria-label="Add plant">+</button>
    </div>
  );
}
