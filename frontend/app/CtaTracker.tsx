'use client';

import { useEffect } from 'react';

const CTA_TEXT = 'Start a Care Plan';
const TRIAL_CTA_TEXT = 'Start 30-Day Free Trial';

/**
 * Fire a key event (generate_lead) when the primary CTA is activated.
 * Listens document-wide so every "Start a Care Plan" instance — nav,
 * footer, hero, persona pages, cases page — is covered without editing
 * each one. Distinct from the signup conversion via lead_source.
 */
function trackCtaActivation(label: string) {
  try {
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({
        event: 'generate_lead',
        lead_source: 'cta_click',
        cta: 'start_care_plan',
        cta_label: label,
      });
    }
  } catch {
    // Tracking must never break the page.
  }
}

function matchesCta(el: Element | null): boolean {
  if (!el || typeof el.textContent !== 'string') return false;
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  return text.includes(CTA_TEXT) || text.includes(TRIAL_CTA_TEXT) || el.hasAttribute('data-cta');
}

export default function CtaTracker() {
  useEffect(() => {
    const onActivate = (e: Event) => {
      const target = e.target as Element | null;
      const el = target?.closest?.('a[href], button') ?? target;
      if (matchesCta(el)) {
        const label =
          el?.getAttribute('aria-label')?.trim() ||
          el?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40) ||
          CTA_TEXT;
        trackCtaActivation(label);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') onActivate(e);
    };
    document.addEventListener('click', onActivate);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onActivate);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  return null;
}