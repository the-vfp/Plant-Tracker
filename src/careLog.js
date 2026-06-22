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
};

// Per-kind display: bubble glyph, uppercase label, and tone (drives bubble/label color).
export const ACTION = {
  water:  { icon: '💧', label: 'Watered',       tone: 'sage' },
  repot:  { icon: '🪴', label: 'Repotted',      tone: 'terra' },
  prune:  { icon: '✂️', label: 'Pruned',        tone: 'terra' },
  fert:   { icon: '🧪', label: 'Fertilized',    tone: 'sage' },
  rotate: { icon: '🔄', label: 'Rotated',       tone: 'ink' },
  move:   { icon: '📦', label: 'Moved',         tone: 'ink' },
  note:   { icon: '📝', label: 'Note',          tone: 'ink' },
  photo:  { icon: '📷', label: 'Photographed',  tone: 'ink' },
};
