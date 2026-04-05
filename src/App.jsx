import { useState } from 'react';
import Home from './components/Home.jsx';
import PlantDetail from './components/PlantDetail.jsx';
import AddPlant from './components/AddPlant.jsx';
import Settings from './components/Settings.jsx';

export default function App() {
  const [view, setView] = useState('home');
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [editPlantId, setEditPlantId] = useState(null);

  const goHome = () => { setView('home'); setSelectedPlantId(null); setEditPlantId(null); };
  const openPlant = (id) => { setSelectedPlantId(id); setView('detail'); };
  const openAdd = () => { setEditPlantId(null); setView('add'); };
  const openEdit = (id) => { setEditPlantId(id); setView('add'); };
  const openSettings = () => setView('settings');

  return (
    <div className="app">
      <header className="app-header">
        {view !== 'home' && (
          <button className="back-btn" onClick={goHome} aria-label="Back">
            &#8592;
          </button>
        )}
        <h1 onClick={goHome} style={{ cursor: 'pointer' }}>
          {view === 'home' && '🌿 My Plants'}
          {view === 'detail' && '🌱 Plant Care'}
          {view === 'add' && (editPlantId ? '✏️ Edit Plant' : '🌱 New Plant')}
          {view === 'settings' && '⚙️ Settings'}
        </h1>
        {view === 'home' && (
          <button className="settings-btn" onClick={openSettings} aria-label="Settings">
            ⚙️
          </button>
        )}
      </header>

      <main className="app-main">
        {view === 'home' && <Home onSelect={openPlant} onAdd={openAdd} />}
        {view === 'detail' && <PlantDetail plantId={selectedPlantId} onEdit={openEdit} onBack={goHome} />}
        {view === 'add' && <AddPlant editId={editPlantId} onDone={goHome} />}
        {view === 'settings' && <Settings />}
      </main>
    </div>
  );
}
