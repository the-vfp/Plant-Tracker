import { db } from './db.js';

// Latest event date in /demo-data.json. Used to re-anchor every seed event
// so the most recent watering always lands one day before the visitor's
// "today" — keeps the Week Ahead and Thirsty list populated regardless of
// when the demo URL is visited.
const SEED_LATEST_EVENT = '2026-04-21T21:40:20.900Z';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const base64ToBlob = (dataUrl) => {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

const shiftDate = (iso, offsetMs) =>
  new Date(new Date(iso).getTime() + offsetMs).toISOString();

export async function seedIfEmpty() {
  const count = await db.plants.count();
  if (count > 0) return;

  let data;
  try {
    const res = await fetch('/demo-data.json');
    if (!res.ok) return;
    data = await res.json();
  } catch {
    return;
  }

  const offsetMs =
    Date.now() - ONE_DAY_MS - new Date(SEED_LATEST_EVENT).getTime();

  const waterings = data.waterings.map((w) => ({
    ...w,
    date: shiftDate(w.date, offsetMs),
  }));
  const notes = data.notes.map((n) => ({
    ...n,
    date: shiftDate(n.date, offsetMs),
  }));
  const photos = (data.photos || []).map((p) => ({
    ...p,
    date: shiftDate(p.date, offsetMs),
    blob: base64ToBlob(p.blob),
    thumbnail: base64ToBlob(p.thumbnail),
  }));

  await db.plants.bulkAdd(data.plants);
  await db.waterings.bulkAdd(waterings);
  await db.notes.bulkAdd(notes);
  if (photos.length > 0) {
    await db.photos.bulkAdd(photos);
  }
}
