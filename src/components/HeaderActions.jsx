// The Help Center lives in the Quartz site, not the app. The ? link and the
// ⚙️ settings button are shared by the cactus headers (app bar + growth view)
// so both are reachable from every screen. Home keeps its own cream-bubble pair.
export const HELP_URL = 'https://quartz-the-vfp.vercel.app/Help-Center/';

// White-on-cactus action cluster for the app bar and growth header. Pass
// onSettings to include the ⚙️ button; omit it (e.g. on the Settings screen
// itself) to render just the ? link.
export default function HeaderActions({ onSettings }) {
  return (
    <div className="header-actions">
      <a
        className="header-btn"
        href={HELP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Help Center"
        title="Help Center"
      >
        ?
      </a>
      {onSettings && (
        <button
          className="header-btn header-btn-settings"
          onClick={onSettings}
          aria-label="Settings"
          title="Settings"
        >
          ⚙️
        </button>
      )}
    </div>
  );
}
