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

// Tri-state emoji filter, mode-locked. A `filters` object maps a glyph to
// 'include' or 'exclude'; glyphs absent from it are unfiltered. Since each log
// entry carries exactly one glyph, "show only A" already hides everything else —
// so holding an include AND an exclude at once would make the exclude a no-op.
// We prevent that: the bar is always purely includes OR purely excludes.
//
// A lone chip (nothing else active) gets the full none → include → exclude → none
// cycle, so a single tap still means "show only this" and a second means "hide
// this". Once another chip is active, this chip is locked to that established
// mode and just toggles in/out of it. To switch the bar's mode, clear down to a
// single chip (or use the All reset).
export function cycleFilter(filters, glyph) {
  const next = { ...filters };
  const cur = next[glyph];
  const other = Object.entries(filters).find(([g]) => g !== glyph);
  const otherMode = other ? other[1] : null;

  if (!otherMode) {
    // Lone chip — full tri-state.
    if (!cur) next[glyph] = 'include';
    else if (cur === 'include') next[glyph] = 'exclude';
    else delete next[glyph];
  } else if (cur) {
    // Locked mode, already set — tapping removes it.
    delete next[glyph];
  } else {
    // Locked mode, not set — join the established mode.
    next[glyph] = otherMode;
  }
  return next;
}

// Does a glyph pass the current filters? Excludes always win. If anything is
// explicitly included, only included glyphs pass; otherwise everything not
// excluded passes. (The bar is never mixed, but this stays correct either way.)
export function passesFilter(glyph, filters) {
  const states = Object.values(filters);
  if (filters[glyph] === 'exclude') return false;
  if (states.includes('include')) return filters[glyph] === 'include';
  return true;
}
