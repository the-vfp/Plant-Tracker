# Plant Tracker

A minimalist, offline-first plant care journal. Log waterings, jot notes, snap photos, and see at a glance which of your plants are thirsty.

Live: [plant-tracker-blue.vercel.app](https://plant-tracker-blue.vercel.app)

## Features

- **Ledger home screen** — journal-style header with the current week, a "thirsty / total" count, and a 7-day strip previewing which plants are due
- **Three tabs** — *Thirsty* (overdue and due today), *Care log* (reverse-chronological feed of every action), *All plants* (sortable grid)
- **Per-plant watering cadence** — set how often each plant needs water; urgency borders turn orange at 75% of the interval and red when overdue
- **Care timeline** — waterings, notes, photos, repots, prunes, fertilizing, rotations, and moves all merged into one feed
- **Notes with emoji** — quick-pick presets (🧪 🪴 ✂️ 🔄 📦) or any custom emoji; edit text and emoji while preserving the original timestamp
- **Photos** — capture from camera or upload, compressed to JPEG and stored locally with thumbnails; tap to view full-size
- **Watering history chart** — collapsible SVG bar chart per plant with 14 / 30 / 90 / 360-day ranges
- **Backup & restore** — JSON export (with or without photos) and import from Settings
- **Installable PWA** — works offline, all data stored in IndexedDB on your device

## Tech stack

- React 19 + Vite
- Dexie (IndexedDB) for local storage
- `vite-plugin-pwa` for offline support and installability
- ESLint with React Hooks and React Refresh plugins

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (default `http://localhost:5173`).

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Build the production bundle |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint over the project |

## Privacy

All plant data, photos, and care logs live in your browser's IndexedDB. Nothing is uploaded to a server. Use **Settings → Export** to make a backup.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.
