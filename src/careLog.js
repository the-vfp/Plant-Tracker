// Shared care-log vocabulary — imported by both the home feed (Home.jsx) and
// the plant-detail timeline (PlantDetail.jsx) so labels, icons, and tone colors
// stay identical across the two views. Edit here, both update.

// Maps a note's emoji to its action kind. Notes without a match fall back to 'note'.
export const NOTE_KIND = {
  '🪴': 'repot',
  '✂️': 'prune',
  '🧪': 'fert',
  '🔄': 'rotate',
  '📦': 'move',
  '🌱': 'propagate',
  '🐛': 'pest',
};

// Per-kind display: bubble glyph, uppercase label, and tone (drives bubble/label color).
export const ACTION = {
  water:  { icon: '💧', label: 'Watered',       tone: 'sage' },
  repot:  { icon: '🪴', label: 'Repotted',      tone: 'terra' },
  prune:  { icon: '✂️', label: 'Pruned',        tone: 'terra' },
  fert:   { icon: '🧪', label: 'Fertilized',    tone: 'sage' },
  rotate: { icon: '🔄', label: 'Rotated',       tone: 'ink' },
  move:   { icon: '📦', label: 'Moved',         tone: 'ink' },
  propagate: { icon: '🌱', label: 'Propagated', tone: 'sage' },
  pest:   { icon: '🐛', label: 'Pest control',  tone: 'terra' },
  note:   { icon: '📝', label: 'Note',          tone: 'ink' },
  photo:  { icon: '📷', label: 'Photographed',  tone: 'ink' },
};

// The glyph shown for a log entry: notes carry their own emoji (including custom
// ones), while water/photo fall back to their action icon. Shared so the master
// care feed and the per-plant timeline filter on exactly the same glyph.
export function entryGlyph(kind, emoji) {
  if (emoji) return emoji;
  return (ACTION[kind] || ACTION.note).icon;
}

// Tri-state emoji filter (manga-style): a `filters` object maps a glyph to
// 'include' or 'exclude'. Tapping a chip cycles none → include → exclude → none.
// Glyphs absent from the object are unfiltered.
export function cycleFilter(filters, glyph) {
  const next = { ...filters };
  const cur = next[glyph];
  if (!cur) next[glyph] = 'include';
  else if (cur === 'include') next[glyph] = 'exclude';
  else delete next[glyph];
  return next;
}

// Does a glyph pass the current filters? Excludes always win. If anything is
// explicitly included, only included glyphs pass; otherwise everything not
// excluded passes.
export function passesFilter(glyph, filters) {
  const states = Object.values(filters);
  if (filters[glyph] === 'exclude') return false;
  if (states.includes('include')) return filters[glyph] === 'include';
  return true;
}
