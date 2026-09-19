import Link from 'next/link';

const features = [
  { href: '/features/cases', title: 'Transition Plan', desc: 'Build a step-by-step care plan before discharge: medications, follow-ups, daily tasks, and emergency contacts.', color: 'bg-[#e8f4ef] text-[#4a7c7e]' },
  { href: '/features/health', title: 'Care Profile', desc: 'Keep diagnosis history, allergies, and discharge instructions in one place everyone can access.', color: 'bg-[#e8eef4] text-[#4a6b8a]' },
  { href: '/features/medications', title: 'Medication Schedule', desc: 'See when each medication is due, who verified it, and log any concerns — all in real time.', color: 'bg-[#e8f4ef] text-[#4a7c7e]' },
  { href: '/features/tasks', title: 'Daily Tasks', desc: 'Assign and track tasks across family members, caregivers, and providers for the first 30 days.', color: 'bg-[#e8eef4] text-[#4a6b8a]' },
  { href: '/features/notifications', title: 'Reminders', desc: 'Get alerts for medication times, follow-up appointments, and overdue tasks.', color: 'bg-[#f5ede5] text-[#a07c4a]' },
  { href: '/features/export', title: 'Export', desc: 'Bring a complete care summary to the first primary care follow-up visit.', color: 'bg-[#f5ede5] text-[#a07c4a]' },
];

const weekByWeek = [
  { n: 'Before Discharge', items: ['Review medications with the discharge planner', 'Confirm follow-up appointments', 'Add emergency contacts to Care Circle', 'Invite caregivers and family to the plan'] },
  { n: 'Week 1', items: ['Daily medication check-ins', 'Log meals, mood, and mobility observations', 'Attend follow-up appointments', 'Keep the facility in the loop'] },
  { n: 'Weeks 2-4', items: ['Review progress and adjust the care plan', 'Export notes for the primary care visit', 'Celebrate small wins with the circle'] },
];

export default function FamilyPage() {
  return (
    <div className="pb-16">
      <section className="relative overflow-hidden">
        <div className="relative h-[clamp(280px,35vw,380px)]">
          <img
            src="/images/senior-daughter.jpg"
            alt="Senior woman with caregiver daughter at home"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.1)_100%)]" />

          <div className="container relative h-full flex flex-col items-start justify-end pb-8 md:pb-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full mb-4 border border-white/30">
                <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">For Families</span>
              </div>
              <h1 className="text-[clamp(1.7rem,3.5vw,2.4rem)] font-extrabold text-white mb-3 tracking-tight leading-tight drop-shadow-sm">
                Be the quarterback your loved one needs
              </h1>
              <p className="text-base text-white/90 max-w-xl leading-relaxed mb-6 drop-shadow-sm">
                The discharge planner hands you a folder. Now what? Care Circle turns that folder into a shared living plan that keeps everyone connected through the first 30 days.
              </p>
              <Link href="/features/cases/" className="btn btn-primary btn-lg shadow-md">
                Start a Transition Plan
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Your 30-Day Toolkit</p>
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">Everything for the transition home</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map(f => (
            <Link key={f.href} href={f.href} className="card group !p-6 hover:-translate-y-1">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${f.color} text-lg font-extrabold shadow-sm`}>{f.title[0]}</div>
              <h3 className="text-lg font-extrabold text-[var(--color-text)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">{f.title}</h3>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Your Timeline</p>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">What to do during the first 30 days</h2>
          </div>
          <div className="space-y-4">
            {weekByWeek.map((w, i) => (
              <div key={w.n} className="card !p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white font-extrabold text-sm flex items-center justify-center shrink-0">{i + 1}</div>
                  <h3 className="font-extrabold text-[var(--color-text)]">{w.n}</h3>
                </div>
                <ul className="space-y-2 pl-11">
                  {w.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-text-light)]">
                      <svg className="w-4 h-4 mt-0.5 text-[var(--color-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="relative h-[260px] md:h-[300px]">
          <img src="/images/elderly-home.jpg" alt="Senior woman relaxing in her home" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[var(--color-secondary)]/20" />
          <div className="container relative h-full flex items-center justify-center">
            <div className="max-w-2xl text-center">
              <blockquote className="text-[clamp(1.1rem,2.2vw,1.5rem)] font-extrabold text-white leading-snug drop-shadow-md mb-3">
                &ldquo;When my father came home from rehab, I finally had one place to track his meds, his appointments, and keep my siblings informed. It made all the difference.&rdquo;
              </blockquote>
              <p className="text-white/90 font-semibold drop-shadow-sm">— Daughter managing her father&apos;s transition</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="card !p-10 md:!p-12 text-center max-w-3xl mx-auto bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border border-[#dcefe7]">
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] mb-4">Ready to feel prepared?</h2>
          <p className="text-[var(--color-text-light)] max-w-md mx-auto mb-8 leading-relaxed">
            Create your first care transition plan before the discharge even happens. Free. No credit card required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/features/cases/" className="btn btn-primary">Start Your First Plan</Link>
            <Link href="/professional/" className="btn btn-outline">For Facilities & Planners</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
