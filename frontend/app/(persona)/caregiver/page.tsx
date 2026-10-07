import Link from 'next/link';

const features = [
  { href: '/features/tasks', title: 'Daily Care Tasks', desc: 'See assigned tasks from the family — wound care, meals, mobility, exercises — mark them complete, add notes.', color: 'bg-[#e8f4ef] text-[#4a7c7e]' },
  { href: '/features/medications', title: 'Med Schedule', desc: 'View exactly when each medication is due, who verified it, and log any missed or delayed doses.', color: 'bg-[#e8eef4] text-[#4a6b8a]' },
  { href: '/features/health', title: 'Health Observations', desc: 'Log vitals, meals, mood, and mobility daily so the family and facility stay informed.', color: 'bg-[#e8f4ef] text-[#4a7c7e]' },
  { href: '/features/notifications', title: 'Reminders', desc: 'Get push or SMS alerts for medication times, appointments, and tasks due — nothing gets forgotten.', color: 'bg-[#f5ede5] text-[#a07c4a]' },
  { href: '/features/export', title: 'Shift Reports', desc: 'Generate a clean summary of tasks completed and observations made during your shift — in seconds.', color: 'bg-[#f5ede5] text-[#a07c4a]' },
];

export default function CaregiverPage() {
  return (
    <div className="pb-16">
      <section className="relative overflow-hidden">
        <div className="relative h-[clamp(280px,35vw,380px)]">
          <img
            src="/images/grandma-granddaughter.jpg"
            alt="Grandmother and granddaughter together at home"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.1)_100%)]" />

          <div className="container relative h-full flex flex-col items-start justify-end pb-8 md:pb-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full mb-4 border border-white/30">
                <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">For Caregivers</span>
              </div>
              <h1 className="text-[clamp(1.7rem,3.5vw,2.4rem)] font-extrabold text-white mb-3 tracking-tight leading-tight drop-shadow-sm">
                Stay connected to the plan
              </h1>
              <p className="text-base text-white/90 max-w-xl leading-relaxed mb-6 drop-shadow-sm">
                The family sets the care plan. You make it happen. Care Circle keeps you in sync with medications, daily tasks, and observations through the first 30 days.
              </p>
              <Link href="/features/tasks/" className="btn btn-primary btn-lg shadow-md">
                View Your Tasks
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Your Toolkit</p>
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">Everything you need for home-based recovery</h2>
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

      <section className="relative overflow-hidden">
        <div className="relative h-[260px] md:h-[300px]">
          <img src="/images/senior-care-team.jpg" alt="Senior woman comfortably at home" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[var(--color-primary)]/22" />
          <div className="container relative h-full flex items-center justify-center">
            <div className="max-w-2xl text-center">
              <blockquote className="text-[clamp(1.1rem,2.2vw,1.5rem)] font-extrabold text-white leading-snug drop-shadow-md mb-3">
                &ldquo;I used to write everything on paper. Now the family sees my notes in real time, and we&apos;re all on the same page.&rdquo;
              </blockquote>
              <p className="text-white/90 font-semibold drop-shadow-sm">— Home care aide, 4 years with Care Circle</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#f4fbf8] text-[#065f46] text-xs font-bold uppercase tracking-[0.1em] px-4 py-2 rounded-full mb-8 border border-[#dcefe7]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
            Stay in Sync
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] mb-6 leading-snug">
            Your work is invaluable. Your tools should keep everything connected.
          </h2>
          <p className="text-[var(--color-text-light)] leading-relaxed mb-10">
            No more confusion about what the doctor said yesterday. No more missed medications. Just a clear plan, shared with everyone who matters, so the person in your care gets the best support possible.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/features/tasks/" className="btn btn-primary">Start Your Task List</Link>
            <Link href="/features/notifications/" className="btn btn-outline">Set Up Reminders</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
