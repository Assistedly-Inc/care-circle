import Link from 'next/link';
import InkbotChat from '@/components/InkbotChat';
import TrialCta from '@/components/TrialCta';

const stakeholders = [
  { slug: 'family', title: 'Families', desc: 'Coordinate everything in the critical first 30 days after discharge.', image: '/images/senior-daughter.jpg', color: 'bg-[#e8f4ef] text-[#4a7c7e]' },
  { slug: 'professional', title: 'Facilities', desc: 'Bridge the gap between your skilled care and safe outcomes at home.', image: '/images/nurse-senior.jpg', color: 'bg-[#ede8f2] text-[#6d1247]' },
  { slug: 'caregiver', title: 'Caregivers', desc: 'Stay connected with medications, tasks, and health updates.', image: '/images/grandma-granddaughter.jpg', color: 'bg-[#f5ede5] text-[#c4956a]' },
  { slug: 'patient', title: 'Your Loved One', desc: 'Feel heard, supported, and never alone during recovery.', image: '/images/senior-navigating.jpg', color: 'bg-[#e8eef4] text-[#4a6b8a]' },
];

const transitionPhases = [
  { label: 'Pre-Discharge', desc: 'Create a care transition plan with meds, follow-ups, and daily tasks.', color: 'bg-[var(--color-primary)]/10' },
  { label: 'Days 1-7', desc: 'Track medications, log observations, and coordinate visits from the care circle.', color: 'bg-[var(--color-accent)]/10' },
  { label: 'Days 8-30', desc: 'Review progress, adjust plans, and export records for the primary care visit.', color: 'bg-[var(--color-secondary)]/10' },
];

export default function HomePage() {
  return (
    <div className="pb-16">
      {/* ─── Hero: Chat is the primary CTA ─── */}
      <section className="relative w-full overflow-hidden">
        <div className="relative min-h-[clamp(600px,80vh,880px)] flex items-center">
          <img src="/images/hero-family-care.jpg" alt="Adult son in a supportive conversation with his elderly father at home" fetchPriority="high" width={2400} height={900} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.6)_40%,rgba(0,0,0,0.28)_100%)]" />

          <div className="container relative w-full py-12 md:py-16">
            <div className="max-w-2xl">
              <h1 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-white mb-2 tracking-tight leading-tight drop-shadow-md">
                The first 30 days home are the most important
              </h1>
              <p className="text-base text-white/90 max-w-xl leading-relaxed drop-shadow-md">
                Assistedly Cares helps families and facilities bridge the gap between discharge and recovery — with shared care plans, medication tracking, and coordinated daily support.
              </p>
            </div>

            {/* Chat box — the primary call to action. Wide + tall so the full
                conversation and prompts fit without scrolling. */}
            <div className="mt-6 max-w-5xl h-[clamp(560px,72vh,820px)]">
              <InkbotChat />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <TrialCta size="btn-lg" source="home_hero" />
              <Link href="/pricing/" className="btn btn-ghost btn-lg">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── The 30-Day Risk ── */}
      <section className="bg-white py-16">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">The Challenge</p>
              <h2 className="text-[clamp(1.5rem,2.8vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-5 tracking-tight leading-snug">
                1 in 5 older adults return to the hospital within 30 days
              </h2>
              <p className="text-[var(--color-text-light)] leading-relaxed mb-6">
                Most of those readmissions are preventable — caused by missed medications, confusion about follow-up appointments, or lack of daily observation. The transition from hospital to home is a critical window where care coordination matters most.
              </p>
              <div className="space-y-4">
                {[
                  { stat: '80%', label: 'of post-discharge complications are preventable with coordinated follow-up care' },
                  { stat: '40%', label: 'of patients experience medication errors shortly after leaving the hospital' },
                  { stat: '75%', label: 'of families say they lack clear guidance on what to do after discharge' },
                ].map(item => (
                  <div key={item.label} className="flex gap-3">
                    <div className="text-[var(--color-accent)] font-extrabold text-lg shrink-0 w-16">{item.stat}</div>
                    <p className="text-[var(--color-text-light)] text-sm leading-relaxed">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-md">
              <img src="/images/home-visit.jpg" alt="Care professional checking in on an elderly man recovering at home" loading="lazy" decoding="async" fetchPriority="low" width={1800} height={1200} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-[var(--color-primary)]/10" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Mid-page CTA: right after the risk framing ── */}
      <section className="bg-[#fdf9f3] border-y border-[var(--color-border)] py-10">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-lg font-extrabold text-[var(--color-text)] tracking-tight">
            Ready to make the first 30 days easier?
          </p>
          <TrialCta size="btn-lg" source="home_midpage" />
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section className="container py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Care Transition Partners</p>
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">One platform, every role in the circle</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stakeholders.map(s => (
            <Link key={s.slug} href={`/${s.slug}`} className="card group overflow-hidden hover:-translate-y-1 !p-0">
              <div className="relative h-36 overflow-hidden">
                <img src={s.image} alt={s.title} loading="lazy" decoding="async" fetchPriority="low" width={1200} height={800} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[var(--color-primary)]/10" />
              </div>
              <div className="p-5">
                <h3 className="text-base font-extrabold text-[var(--color-text)] mb-1 group-hover:text-[var(--color-primary)] transition-colors">{s.title}</h3>
                <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How It Works: 30-Day Journey ── */}
      <section className="bg-white py-16">
        <div className="container">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">How It Works</p>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">A shared care plan for the first 30 days</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {transitionPhases.map((p, i) => (
              <div key={p.label} className="card !p-6 text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 mx-auto font-extrabold text-sm ${p.color} text-[var(--color-secondary)]`}>
                  {i + 1}
                </div>
                <h3 className="font-extrabold text-[var(--color-text)] mb-2">{p.label}</h3>
                <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Photo Quote ── */}
      <section className="relative overflow-hidden">
        <div className="relative h-[280px] md:h-[340px]">
          <img
            src="/images/family-couch.jpg"
            alt="Family relaxing together on couch at home"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={1200}
            height={800}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[var(--color-primary)]/25" />
          <div className="container relative h-full flex items-center justify-center">
            <div className="max-w-2xl text-center">
              <blockquote className="text-[clamp(1.2rem,2.5vw,1.7rem)] font-extrabold text-white leading-snug drop-shadow-md mb-4">
                &ldquo;When my mother came home from skilled nursing, I had a checklist, a medication log, and a way to keep everyone on the same page. For the first time, I felt ready.&rdquo;
              </blockquote>
              <p className="text-white/90 font-semibold drop-shadow-sm">— Daughter managing her mother&apos;s transition</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Built for Facilities Too ── */}
      <section className="container py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">For Facilities</p>
            <h2 className="text-[clamp(1.5rem,2.5vw,2rem)] font-extrabold text-[var(--color-text)] mb-4 tracking-tight leading-snug">
              Discharge with confidence — not just papers
            </h2>
            <p className="text-[var(--color-text-light)] leading-relaxed mb-6">
              Give families more than discharge instructions. Give them a living care plan with medications, follow-ups, daily tasks, and a shared channel to your team. Reduce callbacks, improve satisfaction scores, and lower readmission risk.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Pre-populated care transition plans',
                'Medication reconciliation families can follow',
                'Follow-up appointment scheduling & reminders',
                'Real-time family communication channel',
                'Full audit trail for compliance',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--color-text-light)]">
                  <svg className="w-4 h-4 mt-0.5 text-[var(--color-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/professional/" className="btn btn-ghost">
              For Discharge Planners & Facilities →
            </Link>
          </div>
          <div className="order-1 lg:order-2 relative rounded-[var(--radius-lg)] overflow-hidden shadow-md">
            <img src="/images/nurse-senior.jpg" alt="Discharge coordinator" loading="lazy" decoding="async" fetchPriority="low" width={1200} height={800} className="w-full object-cover" />
            <div className="absolute inset-0 bg-[var(--color-secondary)]/10" />
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="bg-white py-16">
        <div className="container">
          <div className="card !p-10 md:!p-12 text-center max-w-3xl mx-auto bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border border-[#dcefe7]">
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] mb-4 tracking-tight">Privacy and compliance you can trust</h2>
            <p className="text-[var(--color-text-light)] max-w-lg mx-auto mb-8 leading-relaxed">
              Every access is logged, every change is traceable. Built with HIPAA-awareness at its core — whether you're a family or a facility.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['HIPAA-Aware Logging', 'Full Audit Trails', 'Role-Based Access', 'End-to-End Encryption'].map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#065f46] bg-[#d1fae5] px-3 py-1.5 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
              <Link href="/features/audit/" className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                Learn about compliance &amp; audit →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-16">
        <div className="container text-center">
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] mb-4 tracking-tight">
            Ready to support the next care transition?
          </h2>
          <p className="text-[var(--color-text-light)] max-w-md mx-auto mb-8 leading-relaxed">
            Set up your first care transition plan in under two minutes. Free for families. Built for facilities.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <TrialCta size="btn-lg" source="home_endpage" />
            <Link href="/features/cases/" className="btn btn-ghost btn-lg">
              See a live demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
