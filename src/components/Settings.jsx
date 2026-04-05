import { db } from '../db.js';

export default function Settings() {
  const exportData = async () => {
    const plants = await db.plants.toArray();
    const waterings = await db.waterings.toArray();
    const notes = await db.notes.toArray();
    const data = JSON.stringify({ plants, waterings, notes }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plant-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.plants || !data.waterings || !data.notes) {
          alert('Invalid backup file.');
          return;
        }
        if (!confirm('This will replace all current data. Continue?')) return;
        await db.plants.clear();
        await db.waterings.clear();
        await db.notes.clear();
        await db.plants.bulkAdd(data.plants);
        await db.waterings.bulkAdd(data.waterings);
        await db.notes.bulkAdd(data.notes);
        alert('Data restored successfully!');
      } catch {
        alert('Failed to import. Check that the file is valid.');
      }
    };
    input.click();
  };

  const clearAll = async () => {
    if (!confirm('Delete ALL data? This cannot be undone.')) return;
    await db.plants.clear();
    await db.waterings.clear();
    await db.notes.clear();
    alert('All data cleared.');
  };

  return (
    <div className="settings">
      <div className="settings-section">
        <h3>Backup & Restore</h3>
        <p>Export your data as a JSON file, or import a previous backup.</p>
        <div className="settings-buttons">
          <button className="btn-primary" onClick={exportData}>Export Data</button>
          <button className="btn-secondary" onClick={importData}>Import Data</button>
        </div>
      </div>

      <div className="settings-section danger-zone">
        <h3>Danger Zone</h3>
        <button className="btn-danger" onClick={clearAll}>Clear All Data</button>
      </div>
    </div>
  );
}
