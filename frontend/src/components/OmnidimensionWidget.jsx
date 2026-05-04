import { useEffect } from 'react';

const SCRIPT_ID = 'omnidimension-web-widget';

/**
 * Loads https://omnidim.io/web_widget.js when VITE_OMNIDIMENSION_WIDGET_SECRET is set.
 * This is separate from backend OMNIDIMENSION_MODEL / OMNIDIMENSION_API_KEY (used for /api/chatbot).
 */
export default function OmnidimensionWidget() {
  useEffect(() => {
    const secret = import.meta.env.VITE_OMNIDIMENSION_WIDGET_SECRET?.trim();
    if (!secret || typeof document === 'undefined') return;
    if (document.getElementById(SCRIPT_ID)) return;

    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = `https://omnidim.io/web_widget.js?secret_key=${encodeURIComponent(secret)}`;
    document.body.appendChild(s);
  }, []);

  return null;
}
