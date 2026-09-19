import Link from 'next/link';

const features = [
  { href: '/features/cases', title: 'Care Transition Plans', desc: 'Create structured discharge plans that stay alive after the patient leaves, with tasks, meds, and contacts shared.', color: 'bg-[#e8eef4] text-[#4a6b8a]' },
  { href: '/features/medications', title: 'Medication Reconciliation', desc: 'Share reconciled medication lists in a format families can follow — not just printouts.', color: 'bg-[#e8eef4] text-[#4a6b8a]' },
  { href: '/features/tasks', title: 'Follow-Up Scheduling', desc: 'Build post-discharge task lists: wound care, PT exercises, appointment reminders, and more.', color: 'bg-[#e8f4ef] text-[#4a7c7e]' },
  { href: '/features/health', title: 'Health Handoffs', desc: 'Pass diagnosis history, allergies, and care notes securely to the family and next provider.', color: 'bg-[#e8f4ef] text-[#4a7c7e]' },
  { href: '/features/export', title: 'Data Portability', desc: 'Export structured care data for reporting, CMS compliance, and readmission analytics.', color: 'bg-[#f5ede5] text-[#a07c4a]' },
  { href: '/features/audit', title: 'Audit & Compliance', desc: 'Full audit trail of plan creation, updates, and family access — for QA and regulatory review.', color: 'bg-[#f5e5e5] text-[#8a4a4a]' },
  { href: '/features/auth', title: 'Role-Based Access', desc: 'Control who can view, edit, or export — staff, family, outside providers — with instant revocation.', color: 'bg-[#ede8f2] text-[#6d1247]' },
  { href: '/features/notifications', title: 'Family Communication', desc: 'Push updates, reminders, and alerts directly to family phones — reducing callbacks and confusion.', color: 'bg-[#f5ede5] text-[#a07c4a]' },
];

export default function ProfessionalPage() {
  return (
    <div className="pb-16">
      <section className="relative overflow-hidden">
        <div className="relative h-[clamp(280px,35vw,380px)]">
          <img
            src="/images/nurse-senior.jpg"
            alt="Discharge coordinator with family"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.1)_100%)]" />

          <div className="container relative h-full flex flex-col items-start justify-end pb-8 md:pb-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full mb-4 border border-white/30">
                <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5v15m7.5-7.5h-15"/></svg>
                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">For Facilities</span>
              </div>
              <h1 className="text-[clamp(1.7rem,3.5vw,2.4rem)] font-extrabold text-white mb-3 tracking-tight leading-tight drop-shadow-sm">
                Discharge with a living care plan
              </h1>
              <p className="text-base text-white/90 max-w-xl leading-relaxed mb-6 drop-shadow-sm">
                Stop handing families discharge instructions. Give them a digital care plan that stays current, sends reminders, and keeps your team connected — all while you stay compliant.
              </p>
              <Link href="/features/cases/" className="btn btn-primary btn-lg shadow-md">
                Create a Transition Plan
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Built for Your Workflow</p>
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">From discharge instructions to dynamic care coordination</h2>
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

      <section className="bg-white py-16">
        <div className="container">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Impact</p>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] tracking-tight">What facilities gain with Care Circle</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { t: 'Fewer Readmissions', d: 'Families follow the plan when it lives in their pocket — not a folder on the counter.', icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z' },
              { t: 'Higher Satisfaction', d: 'CMS Star Ratings and post-discharge surveys improve when families feel supported, not abandoned.', icon: 'M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z' },
              { t: 'Lower Staff Burden', d: 'Reduce phone callbacks by 40% when families get real-time updates, reminders, and answers in the app.', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
            ].map(item => (
              <div key={item.t} className="card !p-6">
                <svg className="w-8 h-8 text-[var(--color-primary)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                <h3 className="font-extrabold text-[var(--color-text)] mb-2">{item.t}</h3>
                <p className="text-sm text-[var(--color-text-light)] leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="relative h-[260px] md:h-[300px]">
          <img src="/images/seniors-family.jpg" alt="Family feeling relieved" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[var(--color-primary)]/22" />
          <div className="container relative h-full flex items-center justify-center">
            <div className="max-w-2xl text-center">
              <blockquote className="text-[clamp(1.1rem,2.2vw,1.5rem)] font-extrabold text-white leading-snug drop-shadow-md mb-3">
                &ldquo;Finally, a discharge tool that actually helps families stay on track after they leave our building.&rdquo;
              </blockquote>
              <p className="text-white/90 font-semibold drop-shadow-sm">— Director of Care Transitions, SNF</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="card !p-10 md:!p-12 text-center max-w-3xl mx-auto bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border border-[#dcefe7]">
          <h2 className="text-2xl font-extrabold text-[var(--color-text)] mb-4">Ready to modernize your discharge process?</h2>
          <p className="text-[var(--color-text-light)] max-w-md mx-auto mb-8 leading-relaxed">
            Join facilities that are using Care Circle to improve outcomes, reduce readmissions, and raise family satisfaction.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/features/cases/" className="btn btn-primary">Create a Transition Plan</Link>
            <Link href="/features/audit/" className="btn btn-outline">Learn About Compliance</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
