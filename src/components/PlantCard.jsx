export default function PlantCard({ plant, daysSinceWatered, wateringInterval = 7, onWater, onSelect, showType = false }) {
  const daysText =
    daysSinceWatered === null
      ? 'Never watered'
      : daysSinceWatered === 0
        ? 'Watered today'
        : daysSinceWatered === 1
          ? '1 day ago'
          : `${daysSinceWatered} days ago`;

  const urgencyClass =
    daysSinceWatered === null || daysSinceWatered >= wateringInterval
      ? 'urgent'
      : daysSinceWatered >= Math.floor(wateringInterval * 0.75)
        ? 'due-soon'
        : 'ok';

  return (
    <div className={`plant-card ${urgencyClass}`} onClick={onSelect}>
      <div className="plant-icon">{plant.icon || '🌱'}</div>
      <div className="plant-info">
        <h3>{plant.name}</h3>
        {showType && plant.type && <span className="plant-type">{plant.type}</span>}
        <span className="days-label">{daysText}</span>
      </div>
      <button
        className="water-btn"
        onClick={(e) => {
          e.stopPropagation();
          onWater();
        }}
        aria-label={`Water ${plant.name}`}
      >
        💧
      </button>
    </div>
  );
}
