import { useEffect, useState } from 'react';

// Screens are plain React state, but each step forward also goes into the
// browser history, so the phone's back gesture walks back through them
// instead of closing the app. `depth` counts how many steps sit above home.
const HOME = { view: 'home', tab: 'tend' };
const depth = () => window.history.state?.depth ?? 0;

export function useScreenHistory() {
  const [screen, setScreen] = useState(HOME);

  useEffect(() => {
    window.history.replaceState({ screen: HOME, depth: 0 }, '');
    const onPop = (e) => setScreen(e.state?.screen ?? HOME);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (next) => {
    window.history.pushState({ screen: next, depth: depth() + 1 }, '');
    setScreen(next);
  };
  const replace = (next) => {
    window.history.replaceState({ ...window.history.state, screen: next }, '');
    setScreen(next);
  };
  // the on-screen back arrows take the same path as the gesture
  const back = () => (depth() > 0 ? window.history.back() : replace(HOME));
  const home = () => (depth() > 0 ? window.history.go(-depth()) : replace(HOME));

  return { screen, go, replace, back, home };
}

// For overlays (the photo lightbox): opening one adds a history step, so back
// closes it. Close it with history.back() so the step goes away with it.
export function pushOverlay() {
  if (window.history.state?.overlay) return; // StrictMode mounts twice in dev
  window.history.pushState({ ...window.history.state, overlay: true, depth: depth() + 1 }, '');
}
