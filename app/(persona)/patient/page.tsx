import Link from 'next/link';

const features = [
  { href: '/features/health', title: 'My Care Plan', desc: 'Your transition plan, diagnosis, goals, and recovery timeline — all in one private, secure place.', color: 'bg-[#e8f4ef] text-[#4a7c7e]' },
  { href: '/features/medications', title: 'My Medications', desc: 'When to take, how much to take, and who made sure you got it right. No more paper confusion.', color: 'bg-[#e8eef4] text-[#4a6b8a]' },
  { href: '/features/tasks', title: 'My Day', desc: 'Appointments, exercises, and care moments laid out simply so you know what comes next.', color: 'bg-[#e8f4ef] text-[#4a7c7e]' },
  { href: '/features/export', title: 'Download My Record', desc: 'If you ever want your full care summary, it belongs to you. Export it anytime.', color: 'bg-[#f5ede5] text-[#a07c4a]' },
];

export default function PatientPage() {
  return (
    <div className="pb-16">
      <section className="relative overflow-hidden">
        <div className="relative h-[clamp(280px,35vw,380px)]">
          <img
            src="/images/elderly-home.jpg"
            alt="Senior woman at home with family support"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.1)_100%)]" />

          <div className="container relative h-full flex flex-col items-center justify-end pb-8 md:pb-10 text-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full mb-4 border border-white/30">
                <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="currentColor"><path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>
                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">For Your Loved One</span>
              </div>
              <h1 className="text-[clamp(1.7rem,3.5vw,2.4rem)] font-extrabold text-white mb-3 tracking-tight leading-tight drop-shadow-sm">
                You should feel cared for, not confused
              </h1>
              <p className="text-base text-white/90 max-w-xl leading-relaxed mb-6 drop-shadow-sm">
                After the hospital or rehab, coming home should feel like a relief — not a puzzle. Your family, caregivers, and care team are all connected in one place. And you are at the center of it.
              </p>
              <Link href="/features/health/" className="btn btn-primary btn-lg shadow-md">
                View My Care Plan
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">What You Can See</p>
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">Your care journey, clearly laid out</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {features.map(f => (
            <Link key={f.href} href={f.href} className="card group !p-6 hover:-translate-y-1">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${f.color} text-lg font-extrabold shadow-sm`}>{f.title[0]}</div>
              <h3 className="text-base font-extrabold text-[var(--color-text)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">{f.title}</h3>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="relative h-[260px] md:h-[300px]">
          <img src="/images/senior-daughter.jpg" alt="Confident senior at home" className="absolute inset-0 w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-[var(--color-primary)]/18" />
          <div className="absolute inset-0 bg-[var(--color-secondary)]/10" />
          <div className="container relative h-full flex items-center justify-center">
            <div className="max-w-2xl text-center">
              <blockquote className="text-[clamp(1.1rem,2.2vw,1.5rem)] font-extrabold text-white leading-snug drop-shadow-md mb-3">
                &ldquo;Coming home from skilled nursing felt manageable for the first time. Everything — my meds, my exercises, my appointments — was right there. My daughter saw it too.&rdquo;
              </blockquote>
              <p className="text-white/90 font-semibold drop-shadow-sm">— Care Circle patient, age 72</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#f4fbf8] text-[#065f46] text-xs font-bold uppercase tracking-[0.1em] px-4 py-2 rounded-full mb-8 border border-[#dcefe7]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>
            You Are Not Alone
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] mb-6 leading-snug">
            Your health is your story. You should be the one holding the pen.
          </h2>
          <p className="text-[var(--color-text-light)] leading-relaxed mb-10">
            See everything your providers and family see. Track your medications. Understand your care plan. And if you ever want your full record — it is yours, always.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/features/health/" className="btn btn-primary">View My Care Plan</Link>
            <Link href="/features/export/" className="btn btn-outline">Download My Record</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
