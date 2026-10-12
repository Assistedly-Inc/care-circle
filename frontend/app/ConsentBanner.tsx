'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cc-consent';

type ConsentState = {
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
  analytics_storage: 'granted' | 'denied';
};

const ALL_GRANTED: ConsentState = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
};

const ESSENTIAL_ONLY: ConsentState = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};

/** Push a consent update to Google Consent Mode v2 (via gtag, or dataLayer fallback). */
function applyConsent(state: ConsentState) {
  try {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
    if (typeof w.gtag === 'function') {
      w.gtag('consent', 'update', state);
    } else if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push(['consent', 'update', state]);
    }
  } catch {
    // Consent plumbing must never break the page.
  }
}

function hasStoredChoice(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.v === 1;
  } catch {
    return false;
  }
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasStoredChoice()) setVisible(true);
  }, []);

  if (!visible) {
    // Server-render a marker so the auditor can detect the CMP exists;
    // visibility is controlled client-side only (no flash for returning users).
    return <div data-consent-banner="pending" aria-hidden="true" className="hidden" />;
  }

  const choose = (state: ConsentState, choice: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, choice, ts: Date.now() }));
    } catch {
      // ignore storage failures (private mode)
    }
    applyConsent(state);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[60] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-md)]"
    >
      <p className="text-sm font-extrabold text-[var(--color-text)] mb-1">We respect your privacy</p>
      <p className="text-xs text-[var(--color-text-light)] leading-relaxed mb-4">
        We use cookies and analytics to measure our advertising and improve this site. You can accept
        all, or choose essential-only. See our{' '}
        <a href="/privacy/" className="text-[var(--color-primary)] font-semibold hover:underline">
          privacy policy
        </a>
        .
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose(ALL_GRANTED, 'all')}
          className="btn btn-primary text-sm !py-2 !px-4"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => choose(ESSENTIAL_ONLY, 'essential')}
          className="text-sm font-semibold text-[var(--color-text-light)] hover:text-[var(--color-text)] px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)]"
        >
          Essential only
        </button>
      </div>
    </div>
  );
}