import Link from 'next/link';

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
      {/* ─── Hero: Discharge is the beginning ─── */}
      <section className="relative w-full overflow-hidden">
        <div className="relative h-[clamp(260px,32vw,360px)] bg-[#FDF9F3]">
          {/* Pastel blobs */}
          <div className="hero-pastels">
            <div className="pastel-blob blob-1" aria-hidden="true"></div>
            <div className="pastel-blob blob-2" aria-hidden="true"></div>
            <div className="pastel-blob blob-3" aria-hidden="true"></div>
            <div className="pastel-blob blob-4" aria-hidden="true"></div>
            <div className="pastel-blob blob-5" aria-hidden="true"></div>
          </div>
          
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.35)_50%,rgba(0,0,0,0.12)_100%)]" />
          
          <div className="container relative h-full flex flex-col items-start justify-end pb-10 md:pb-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#A8D8EA]/80 backdrop-blur-sm rounded-full border border-white/30 mb-3">
                <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-white/90">Care Circle</span>
              </div>
              <h1 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-[#2D2926] mb-2 tracking-tight leading-tight drop-shadow-sm">
                The first 30 days home are the most important
              </h1>
              <p className="text-base text-[#2D2926]/90 max-w-xl mb-5 leading-relaxed drop-shadow-sm">
                Care Circle helps families and facilities bridge the gap between discharge and recovery — with shared care plans, medication tracking, and coordinated daily support.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/features/cases/" className="btn btn-primary btn-lg shadow-md">
                  Start a Care Transition
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </Link>
              </div>
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
              <img src="/images/bath-safety.jpg" alt="Safe bathroom for elderly home care" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-[var(--color-primary)]/10" />
            </div>
          </div>
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
                <img src={s.image} alt={s.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
            <Link href="/professional/" className="btn btn-primary">
              For Discharge Planners & Facilities →
            </Link>
          </div>
          <div className="order-1 lg:order-2 relative rounded-[var(--radius-lg)] overflow-hidden shadow-md">
            <img src="/images/nurse-senior.jpg" alt="Discharge coordinator" className="w-full object-cover" />
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
            <Link href="/features/cases/" className="btn btn-primary btn-lg">
              Start a Transition
            </Link>

          </div>
        </div>
      </section>
    </div>
  );
}
