import { useState } from 'react';
import { db } from '../db.js';
import { buildContext } from '../contextExport.js';

const blobToBase64 = (blob) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.readAsDataURL(blob);
});

const base64ToBlob = (dataUrl) => {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Settings() {
  const [shareStatus, setShareStatus] = useState('');
  const exportData = async (includePhotos) => {
    const plants = await db.plants.toArray();
    const waterings = await db.waterings.toArray();
    const notes = await db.notes.toArray();

    let photos = [];
    if (includePhotos) {
      const rawPhotos = await db.photos.toArray();
      photos = await Promise.all(rawPhotos.map(async (p) => ({
        ...p,
        blob: await blobToBase64(p.blob),
        thumbnail: await blobToBase64(p.thumbnail),
      })));
    }

    const data = JSON.stringify({ plants, waterings, notes, photos }, null, 2);
    downloadBlob(new Blob([data], { type: 'application/json' }), `plant-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`);
  };

  // "Copy for Claude": the same tables as a backup, but written out as a
  // readable Markdown briefing (see contextExport.js). Photos contribute only
  // their count and latest date — no image data leaves the device.
  const buildShareText = async () => {
    const [plants, waterings, notes, rawPhotos] = await Promise.all([
      db.plants.toArray(), db.waterings.toArray(), db.notes.toArray(), db.photos.toArray(),
    ]);
    const photos = rawPhotos.map(({ id, plantId, date }) => ({ id, plantId, date }));
    return buildContext({ plants, waterings, notes, photos });
  };

  const shareFilename = () => `plant-context-${new Date().toISOString().slice(0, 10)}.md`;

  const copyContext = async () => {
    const text = await buildShareText();
    const words = text.split(/\s+/).filter(Boolean).length;
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus(`Copied — about ${words.toLocaleString()} words. Paste it into a chat with Claude.`);
    } catch {
      downloadBlob(new Blob([text], { type: 'text/markdown' }), shareFilename());
      setShareStatus('Clipboard was blocked, so it downloaded as a file instead.');
    }
  };

  const downloadContext = async () => {
    const text = await buildShareText();
    downloadBlob(new Blob([text], { type: 'text/markdown' }), shareFilename());
    setShareStatus('Downloaded as Markdown.');
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
        await db.photos.clear();

        await db.plants.bulkAdd(data.plants);
        await db.waterings.bulkAdd(data.waterings);
        await db.notes.bulkAdd(data.notes);

        if (data.photos && data.photos.length > 0) {
          const restoredPhotos = data.photos.map((p) => ({
            ...p,
            blob: base64ToBlob(p.blob),
            thumbnail: base64ToBlob(p.thumbnail),
          }));
          await db.photos.bulkAdd(restoredPhotos);
        }

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
    await db.photos.clear();
    alert('All data cleared.');
  };

  return (
    <div className="settings">
      <div className="settings-section">
        <h3>Backup & Restore</h3>
        <p>Export your data as a JSON file, or import a previous backup.</p>
        <div className="settings-buttons">
          <button className="btn-primary" onClick={() => exportData(false)}>Export Data</button>
          <button className="btn-secondary" onClick={() => exportData(true)}>Export with Photos</button>
        </div>
        <div className="settings-buttons" style={{ marginTop: '10px' }}>
          <button className="btn-secondary" onClick={importData}>Import Data</button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Share with Claude</h3>
        <p>A plain-text summary of your collection — schedules, what's overdue, how often each plant really gets watered, recent notes — shaped for pasting into a chat with Claude or any assistant. No photos, and nothing leaves your device until you paste it.</p>
        <div className="settings-buttons">
          <button className="btn-primary" onClick={copyContext}>📋 Copy for Claude</button>
          <button className="btn-secondary" onClick={downloadContext}>Download .md</button>
        </div>
        {shareStatus && <p className="settings-status">{shareStatus}</p>}
      </div>

      <div className="settings-section danger-zone">
        <h3>Danger Zone</h3>
        <button className="btn-danger" onClick={clearAll}>Clear All Data</button>
      </div>
    </div>
  );
}
