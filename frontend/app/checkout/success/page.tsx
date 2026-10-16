import type { Metadata } from 'next';
import Link from 'next/link';
import TrialCta from '@/components/TrialCta';

export const metadata: Metadata = {
  title: 'Trial Started | Assistedly Cares',
  robots: { index: false, follow: false },
};

/**
 * Post-checkout thank-you page (embedded Checkout redirect target).
 * Confirmed trial signups land here via return_url with ?session_id=.
 * Not indexed (post-conversion page).
 */
export default function CheckoutSuccessPage() {
  return (
    <div className="pb-16">
      <section className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-14 md:py-20 text-center">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#d1fae5] text-[#065f46] mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </span>
          <h1 className="text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            You&apos;re in — your 30-day free trial is active.
          </h1>
          <p className="text-[var(--color-text-light)] max-w-xl mx-auto leading-relaxed mb-6">
            Your care plan space is ready. Check your email for your sign-in link,
            then start building your first care transition plan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/features/auth/" className="btn btn-primary btn-lg">
              Sign in to get started
            </Link>
            <Link href="/features/cases/" className="btn btn-ghost btn-lg">
              See your care plans
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: '1 · Sign in',
              desc: 'Use the magic link we emailed you to create your secure account.',
            },
            {
              title: '2 · Build your plan',
              desc: 'Add medications, tasks, follow-ups, and contacts for the first 30 days after discharge.',
            },
            {
              title: '3 · Invite the circle',
              desc: 'Share access with family, caregivers, or your facility team.',
            },
          ].map(step => (
            <div key={step.title} className="card !p-6">
              <h2 className="text-base font-extrabold text-[var(--color-text)] mb-2">{step.title}</h2>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-[var(--color-text-light)] mb-3">
            Questions? <Link href="/chat/" className="font-semibold text-[var(--color-primary)] hover:underline">Chat with Inkbot</Link> or email{' '}
            <a href="mailto:support@assistedly.ai" className="font-semibold text-[var(--color-primary)] hover:underline">support@assistedly.ai</a>.
          </p>
          <TrialCta label="Invite your care circle" href="/features/cases/" microcopy={false} />
        </div>
      </section>
    </div>
  );
}