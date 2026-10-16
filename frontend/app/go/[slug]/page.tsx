import Link from 'next/link';
import type { Metadata } from 'next';
import { goThemes, goThemeBySlug } from '../go-data';

export function generateStaticParams() {
  return goThemes.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const theme = goThemeBySlug[slug];
  if (!theme) return {};
  return {
    title: theme.metaTitle,
    description: theme.metaDescription,    robots: { index: false, follow: false },
  };
}

export default async function GoLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = goThemeBySlug[slug];
  if (!theme) return null;

  return (
    <div className="pb-16">
      {/* ─── Hero: ad-mirroring headline + primary CTA ─── */}
      <section className="relative w-full overflow-hidden">
        <div className="relative min-h-[clamp(480px,68vh,760px)] flex items-center">
          <img
            src="/images/home-visit.jpg"
            alt="Care professional checking in on an older adult recovering at home"
            fetchPriority="high"
            width={1800}
            height={1200}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.62)_40%,rgba(0,0,0,0.30)_100%)]" />

          <div className="container relative w-full py-12 md:py-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#A8D8EA]/80 backdrop-blur-sm rounded-full border border-white/30 mb-4">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-white/90">
                  {theme.eyebrow}
                </span>
              </div>
              <h1 className="text-[clamp(1.7rem,3.6vw,2.5rem)] font-extrabold text-white mb-3 tracking-tight leading-tight drop-shadow-md">
                {theme.h1}
              </h1>
              <p className="text-base md:text-lg text-white/90 max-w-xl leading-relaxed drop-shadow-md">
                {theme.subhead}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/features/cases/"
                  className="btn btn-primary btn-lg shadow-md"
                  data-cta="go_landing"
                >
                  Start a Care Plan
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="/chat/" className="btn btn-outline btn-lg">
                  Ask the concierge
                </Link>
              </div>
              <p className="mt-4 text-sm text-white/70">
                Free for families · HIPAA-aware · Built for MA home health agencies
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Proof stats ─── */}
      {theme.stats.length > 0 && (
        <section className="bg-white py-14 border-b border-[var(--color-border)]">
          <div className="container">
            <div className="grid sm:grid-cols-3 gap-6">
              {theme.stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl font-extrabold text-[var(--color-accent)]">{s.value}</div>
                  <p className="text-sm text-[var(--color-text-light)] mt-1 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── What you get ─── */}
      <section className="container py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">
              What you get
            </p>
            <h2 className="text-[clamp(1.4rem,2.6vw,2rem)] font-extrabold text-[var(--color-text)] mb-5 tracking-tight leading-snug">
              {theme.h1}
            </h2>
            <ul className="space-y-3">
              {theme.bullets.map((b) => (
                <li key={b} className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[var(--color-text-light)] leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/features/cases/" className="btn btn-primary btn-lg" data-cta="go_landing_repeat">
                Start a Care Plan
              </Link>
            </div>
          </div>

          {/* ─── Ad mirror block: shows the exact ad copy this page matches ─── */}
          <div className="card p-6 space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              You clicked an ad for this
            </p>
            <div className="border border-[var(--color-border)] rounded-xl p-4 bg-gray-50/60">
              <p className="text-sm font-semibold text-[var(--color-primary)] leading-snug">
                {theme.adHeadlines[0]} · {theme.adHeadlines[1]}
              </p>
              <p className="text-sm text-[var(--color-text-light)] mt-2">
                {theme.adDescriptions[0]}
              </p>
              <p className="text-xs text-[var(--color-text-light)] mt-1">assistedly.ai/go/{theme.slug}/</p>
            </div>
            <p className="text-sm text-[var(--color-text-light)]">
              The page you are on mirrors that promise — no bait and switch. Sign up and see it work.
            </p>
            <Link href="/features/auth/" className="btn btn-outline w-full justify-center">
              Sign in to see the demo
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="bg-[var(--color-primary)]/5 py-16">
        <div className="container text-center">
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight mb-3">
            Ready to see it with your patients?
          </h2>
          <p className="text-[var(--color-text-light)] max-w-xl mx-auto mb-6">
            Set up your first care transition plan in under two minutes. Free for families — and for the first
            30 days, free for your agency.
          </p>
          <Link href="/features/cases/" className="btn btn-primary btn-lg" data-cta="go_landing_final">
            Start a Care Plan
          </Link>
        </div>
      </section>
    </div>
  );
}
