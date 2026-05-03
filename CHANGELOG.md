# Changelog

## 2026-05-02 — Demo Seed
- Replaced the 17-plant placeholder seed (no events, no photos) with a curated lived-in dataset (19 plants, 47 waterings, 45 notes, 42 photos) so first-time visitors to the demo URL land on a populated app instead of an empty starter screen
- Seed dates re-anchor on first load — every event shifts so the most recent watering always lands one day before the visitor's "today," keeping the Week Ahead and Thirsty list populated regardless of when the demo is opened
- Seed data ships as a static asset (`public/demo-data.json`) so the JSON stays out of the JS bundle

## 2026-04-17 — Ledger Polish
- Plant cards in the All plants tab now show the species type in small-caps mono
- Dropped the redundant sage app-bar on the home screen; settings gear moved to the top-right of the Ledger header
- Add-plant FAB now only appears on the All plants tab (no longer floats over Thirsty or Care log)
- Unified Thirsty and All plants rows into one flat row style (serif name, mono secondary line, 💧 emoji quick-water button); replaces the old card-vs-row inconsistency

## 2026-04-17 — Ledger Home Screen
- New journal-style home screen replaces the flat plant list
- Header shows week number, month/year, and "X thirsty · Y total"
- "The Week Ahead" strip previews the next 7 days with a moss-green dot for any day that has plants due
  - Stacked emoji avatars show which plants are scheduled (+N pill when overflowing)
  - Tap a day to open a drawer with emoji+name pills; tap any pill to jump to that plant
- Tabbed content: **Thirsty** (default), **Care log**, **All plants**
  - Thirsty: overdue/today plants with a Water pill that logs a watering inline
  - Care log: reverse-chronological feed merging waterings, notes, photos, repots, prunes, fertilizing, rotations, moves — infinite scroll (20 at a time)
  - All plants: existing card grid with sort pills (Date acquired / Name / Type)
- Fully italic serif headline; minimalist cream + moss + terracotta palette

## 2026-04-11 — Note Emoji & Editing
- Emoji picker for care notes: quick-select presets for common activities (🧪 fertilizer, 🪴 repotting, ✂️ pruning, 🔄 rotation, 📦 moving)
- Custom emoji input for any other emoji via keyboard
- Selected emoji displays in the care log timeline instead of generic 📝
- Edit existing notes: tap ✏️ to update text and emoji, preserving the original timestamp
- Deployed to Vercel at plant-tracker-blue.vercel.app

## 2026-04-11 — Watering Features
- Watering history bar chart on plant detail view (collapsible, pure SVG)
  - Toggle between 14-day, 30-day, 90-day, and 360-day ranges
  - Shows watering frequency per time bucket with sage green bars
- Per-plant watering cadence: set how often each plant needs water (e.g. every 7 days, every 21 days)
  - New "Water Every (days)" field on add/edit plant form
  - Home screen urgency borders now use each plant's own interval
  - Orange at 75% of interval, red when due or overdue
- Fix: watering interval input can now be cleared and retyped freely

## 2026-04-07 — Photo Upload
- Add photo capture and upload on plant detail view (camera or file picker)
- Photos compressed to JPEG and stored in IndexedDB with thumbnails
- Photos appear in the care timeline alongside waterings and notes
- Tap a thumbnail to view full-size in a lightbox overlay
- Backup export now has "Export with Photos" option
- Import handles backups with or without photos

## 2026-04-06 — Initial Release
- Plant list with emoji icons and watering status (urgent/due soon/ok)
- Plant detail view with care log timeline (waterings + notes)
- Add/edit plants with name, species type, and emoji picker
- Quick-water button from home grid and detail view
- Settings: JSON backup/restore, clear all data
- Offline-first PWA with IndexedDB storage
- 17 plants pre-configured with species via database migration
