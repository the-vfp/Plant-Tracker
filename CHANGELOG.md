# Changelog

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
