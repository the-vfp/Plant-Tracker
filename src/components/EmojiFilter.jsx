// A tri-state chip bar for filtering a care log by entry glyph (manga-style):
// tap a glyph to include it, tap again to exclude it, tap a third time to clear.
// Multiple glyphs can be active at once — excludes always win, and if anything is
// included only included glyphs show (see passesFilter in careLog.js). The "All"
// chip clears every filter. Shared by the master care feed (Home) and the
// per-plant timeline (PlantDetail). Hidden when there's nothing to filter.
export default function EmojiFilter({ glyphs, filters, onCycle, onClear }) {
  if (glyphs.length < 2) return null;
  const anyActive = Object.keys(filters).length > 0;
  return (
    <div className="emoji-filter" role="group" aria-label="Filter by emoji">
      <button
        type="button"
        className={`emoji-filter-chip is-all ${anyActive ? '' : 'active'}`}
        onClick={onClear}
        aria-pressed={!anyActive}
      >
        All
      </button>
      {glyphs.map((g) => {
        const state = filters[g]; // undefined | 'include' | 'exclude'
        return (
          <button
            key={g}
            type="button"
            className={`emoji-filter-chip ${state || ''}`}
            onClick={() => onCycle(g)}
            aria-pressed={state === 'include'}
            aria-label={
              state === 'include'
                ? `Showing only ${g} — tap to exclude`
                : state === 'exclude'
                  ? `Hiding ${g} — tap to clear`
                  : `Filter by ${g}`
            }
            title={
              state === 'include'
                ? 'Showing only this — tap to exclude'
                : state === 'exclude'
                  ? 'Hidden — tap to clear'
                  : 'Tap to show only this'
            }
          >
            {g}
          </button>
        );
      })}
    </div>
  );
}
