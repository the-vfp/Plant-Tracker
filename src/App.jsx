import Home from './components/Home.jsx';
import PlantDetail from './components/PlantDetail.jsx';
import GrowthTimeline from './components/GrowthTimeline.jsx';
import AddPlant from './components/AddPlant.jsx';
import Settings from './components/Settings.jsx';
import HeaderActions from './components/HeaderActions.jsx';
import { useScreenHistory } from './useScreenHistory.js';

export default function App() {
  const { screen, go, replace, back, home } = useScreenHistory();
  const { view, plantId: selectedPlantId = null, editId: editPlantId = null } = screen;

  const goHome = home;
  const openPlant = (id) => go({ view: 'detail', plantId: id });
  const openAdd = () => go({ view: 'add' });
  const openEdit = (id) => go({ view: 'add', editId: id, plantId: selectedPlantId });
  const openSettings = () => go({ view: 'settings', plantId: selectedPlantId });
  // The growth timeline is a focused full-screen view with its own header,
  // so it skips the shared app bar and returns to the plant it came from.
  const openGrowth = () => go({ view: 'growth', plantId: selectedPlantId });
  // Home's tabs: leaving Tend is one step back, moving between the other tabs isn't
  const setTab = (tab) => {
    if (tab === screen.tab) return;
    if (screen.tab === 'tend') go({ ...screen, tab });
    else if (tab === 'tend') back();
    else replace({ ...screen, tab });
  };

  return (
    <div className="app">
      {view !== 'home' && view !== 'growth' && (
        <header className="app-header">
          <button className="back-btn" onClick={back} aria-label="Back">
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
        <GrowthTimeline plantId={selectedPlantId} onBack={back} onSettings={openSettings} />
      ) : (
        <main className={`app-main ${view === 'home' ? 'app-main-home' : ''}`}>
          {view === 'home' && <Home tab={screen.tab} onTab={setTab} onSelect={openPlant} onAdd={openAdd} onSettings={openSettings} />}
          {view === 'detail' && <PlantDetail plantId={selectedPlantId} onEdit={openEdit} onBack={back} onViewGrowth={openGrowth} />}
          {view === 'add' && <AddPlant editId={editPlantId} onDone={back} />}
          {view === 'settings' && <Settings />}
        </main>
      )}
    </div>
  );
}
