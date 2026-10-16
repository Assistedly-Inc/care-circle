import type { Metadata } from 'next';
import Link from 'next/link';
import TrialCta from '@/components/TrialCta';

export const metadata: Metadata = {
  title: 'Pricing | Assistedly Cares',
  description:
    'Start your 30-day free trial of Assistedly Cares. Care coordination for the critical first 30 days after discharge — free for 30 days, no credit card required.',
};

const tiers = [
  {
    name: 'Free (Demo)',
    price: '$0',
    cadence: 'forever',
    tagline: 'Explore a sample care plan.',
    features: [
      'Sample care plan (demo mode)',
      'Explore medications, tasks & health tabs',
      'Chat with Us (demo)',
      'No credit card required',
    ],
    cta: { label: 'Try the demo', href: '/features/cases/' },
    highlighted: false,
  },
  {
    name: 'Care Plan',
    price: 'First 30 days free',
    cadence: 'then a simple monthly plan',
    tagline: 'Real care plans for your family or facility.',
    features: [
      'Unlimited care plans',
      'Medication tracking & reminders',
      'Tasks, follow-ups & health logs',
      'Export records for PCP visits',
      'Secure HIPAA-aware infrastructure',
      'Cancel anytime',
    ],
    cta: { label: 'Start 30-Day Free Trial', href: '/checkout/' },
    highlighted: true,
  },
  {
    name: 'Facility',
    price: 'Contact us',
    cadence: 'tailored for agencies',
    tagline: 'White-glove onboarding for home-care agencies.',
    features: [
      'Everything in Care Plan',
      'Staff & roster management',
      'Multi-facility coordination',
      'Dedicated support & setup',
    ],
    cta: { label: 'Talk to sales', href: 'mailto:support@assistedly.ai' },
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="pb-16">
      <section className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-12 md:py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Pricing</p>
          <h1 className="text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            Start free. Keep everyone in sync for the first 30 days.
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl mx-auto leading-relaxed mb-6">
            Every discharge plan lives in one place — medications, follow-ups, contacts, and daily tasks.
            Try it free for 30 days. No credit card required. Cancel anytime.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <TrialCta size="btn-lg" source="pricing_hero" />
            <Link href="/features/cases/" className="btn btn-ghost btn-lg">See a live demo</Link>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {tiers.map(tier => (
            <div
              key={tier.name}
              className={`card flex flex-col !p-6 relative ${
                tier.highlighted ? 'border-2 border-[var(--color-primary)] shadow-[var(--shadow-md)]' : ''
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-1">{tier.name}</h2>
              <p className="text-2xl font-extrabold text-[var(--color-primary)] mb-0.5">{tier.price}</p>
              <p className="text-xs text-[var(--color-text-light)] mb-3">{tier.cadence}</p>
              <p className="text-sm text-[var(--color-text-light)] mb-4">{tier.tagline}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {tier.highlighted ? (
                <TrialCta source={`pricing_${tier.name.toLowerCase().replace(/\s+/g, '_')}`} microcopy={false} />
              ) : (
                <Link href={tier.cta.href} className="btn btn-outline w-full justify-center">{tier.cta.label}</Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-[var(--color-text-light)]">
            Secure checkout by <span className="font-semibold">Stripe</span> · HIPAA-aware infrastructure · Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}