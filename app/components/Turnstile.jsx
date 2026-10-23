'use client';

import { useEffect, useRef } from 'react';

// Cloudflare Turnstile widget. Renders nothing when no site key is set, so
// the site behaves as before until the keys go in. Hands each token to
// onToken (and null when it expires), so the form can hold its submit until
// the check has run.
//
// Invisible to real people in the normal case: the widget runs its check
// in the background and shows a small "verified" line, never a puzzle.

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

let scriptPromise = null;
function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) { resolve(window.turnstile); return; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function Turnstile({ onToken, action = 'submit', className = '' }) {
  const ref = useRef(null);
  const idRef = useRef(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return undefined;
    let cancelled = false;
    loadScript().then((turnstile) => {
      if (cancelled || !ref.current || !turnstile) return;
      idRef.current = turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        theme: 'dark',
        size: 'flexible',
        callback: (token) => cb.current?.(token),
        'expired-callback': () => cb.current?.(null),
        'error-callback': () => cb.current?.(null),
      });
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      try { if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current); } catch { /* gone */ }
    };
  }, [action]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className={`turnstile ${className}`.trim()} />;
}
