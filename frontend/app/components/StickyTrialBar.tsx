'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { preloadStripeJs } from '@/lib/stripePreload';

const HIDDEN_PATHS = ['/checkout', '/pricing', '/features/auth'];

/**
 * Mobile-only sticky bottom bar with the trial CTA (modern mobile conversion
 * best practice). Hidden on checkout/pricing/auth so it never competes with
 * the flow's own CTA. Additive; does not affect desktop layout.
 */
export default function StickyTrialBar() {
  const pathname = usePathname() || '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hidden = HIDDEN_PATHS.some(p => pathname.startsWith(p));
  if (hidden || !scrolled) return null;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[var(--color-border)] bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--color-text)] leading-tight">
          First 30 days free
          <span className="block font-normal text-[var(--color-text-light)]">No credit card required</span>
        </p>
        <Link
          href="/checkout/"
          data-cta="start_trial"
          onClick={() => preloadStripeJs()}
          className="btn btn-primary btn-gold-ring !py-2.5 !px-5 text-sm whitespace-nowrap"
        >
          Start 30-Day Free Trial
        </Link>
      </div>
    </div>
  );
}