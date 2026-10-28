import { useEffect, useRef } from 'react';
import { pushOverlay } from '../useScreenHistory.js';

export default function Lightbox({ src, onClose }) {
  // back (gesture, Escape, ×, or a tap outside the photo) closes it
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    pushOverlay();
    const onPop = () => onCloseRef.current();
    const handleKey = (e) => {
      if (e.key === 'Escape') window.history.back();
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);
  const close = () => window.history.back();

  return (
    <div className="lightbox-overlay" onClick={close}>
      <button className="lightbox-close" onClick={close} aria-label="Close">
        &times;
      </button>
      <img
        src={src}
        alt="Full size plant photo"
        className="lightbox-image"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
