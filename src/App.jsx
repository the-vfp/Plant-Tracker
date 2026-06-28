import { useState } from 'react';
import Home from './components/Home.jsx';
import PlantDetail from './components/PlantDetail.jsx';
import GrowthTimeline from './components/GrowthTimeline.jsx';
import AddPlant from './components/AddPlant.jsx';
import Settings from './components/Settings.jsx';
import HeaderActions from './components/HeaderActions.jsx';

export default function App() {
  const [view, setView] = useState('home');
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [editPlantId, setEditPlantId] = useState(null);

  const goHome = () => { setView('home'); setSelectedPlantId(null); setEditPlantId(null); };
  const openPlant = (id) => { setSelectedPlantId(id); setView('detail'); };
  const openAdd = () => { setEditPlantId(null); setView('add'); };
  const openEdit = (id) => { setEditPlantId(id); setView('add'); };
  const openSettings = () => setView('settings');
  // The growth timeline is a focused full-screen view with its own header,
  // so it skips the shared app bar and returns to the plant it came from.
  const openGrowth = () => setView('growth');
  const backToDetail = () => setView('detail');

  return (
    <div className="app">
      {view !== 'home' && view !== 'growth' && (
        <header className="app-header">
          <button className="back-btn" onClick={goHome} aria-label="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 onClick={goHome} style={{ cursor: 'pointer' }}>
            {view === 'detail' && '🌱 Plant Care'}
            {view === 'add' && (editPlantId ? '✏️ Edit Plant' : '🌱 New Plant')}
            {view === 'settings' && '⚙️ Settings'}
          </h1>
          <HeaderActions onSettings={view !== 'settings' ? openSettings : undefined} />
        </header>
      )}

      {view === 'growth' ? (
        <GrowthTimeline plantId={selectedPlantId} onBack={backToDetail} onSettings={openSettings} />
      ) : (
        <main className={`app-main ${view === 'home' ? 'app-main-home' : ''}`}>
          {view === 'home' && <Home onSelect={openPlant} onAdd={openAdd} onSettings={openSettings} />}
          {view === 'detail' && <PlantDetail plantId={selectedPlantId} onEdit={openEdit} onBack={goHome} onViewGrowth={openGrowth} />}
          {view === 'add' && <AddPlant editId={editPlantId} onDone={goHome} />}
          {view === 'settings' && <Settings />}
        </main>
      )}
    </div>
  );
}
