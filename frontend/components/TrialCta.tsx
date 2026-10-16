'use client';

import Link from 'next/link';
import { preloadStripeJs } from '@/lib/stripePreload';

const CHECKOUT_PATH = '/checkout/';

/**
 * Ecommerce CTA — "Start 30-Day Free Trial" → Stripe checkout (/checkout/).
 * Includes risk-reversal microcopy. Tracked by CtaTracker via data-cta.
 * Additive-only: existing lead-capture flows are untouched.
 */
export default function TrialCta({
  label = 'Start 30-Day Free Trial',
  href = CHECKOUT_PATH,
  size = '',
  source,
  microcopy = true,
  className = '',
}: {
  label?: string;
  href?: string;
  size?: string;
  source?: string;
  microcopy?: boolean;
  className?: string;
}) {
  const target = source
    ? `${href}?utm_source=${encodeURIComponent(source)}&utm_medium=cta&utm_campaign=free_trial`
    : href;
  return (
    <span className={`inline-flex flex-col items-start gap-1.5 ${className}`}>
      <Link
        href={target}
        data-cta="start_trial"
        onClick={() => preloadStripeJs()}
        className={`btn btn-primary btn-gold-ring ${size}`}
      >
        {label}
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </Link>
      {microcopy && (
        <span className="text-xs text-[var(--color-text-light)]">
          Free for 30 days · No credit card required · Cancel anytime
        </span>
      )}
    </span>
  );
}