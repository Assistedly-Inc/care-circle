'use client';

import Link from 'next/link';

export default function AuthFeaturePage() {
  return (
    <div className="pb-16">
      <div className="container max-w-4xl py-10 md:py-14">
        <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
          The right information, for the right people, at the right time
        </h1>
        <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed mb-10">
          Care Circle is built on a simple promise: everyone in your circle — relatives, caregivers, and care coordinators — gets exactly the information they need, and nothing they don&apos;t. Privacy isn&apos;t a feature bolted on at the end; it&apos;s how the product works.
        </p>

        {/* Role-based access */}
        <section className="card !p-6 md:!p-8 mb-6">
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-6">Role-based access for every member of the care team</h2>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-6">
            Coordinators organize care and manage the circle. Caregivers update tasks, verify medications, and log observations. Family members stay informed with read access. Everyone sees their role&apos;s view — no more, no less.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="badge bg-[#e8f4ef] text-[#4a7c7e]">Coordinator</span>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Organizes care and manages the circle — full read/write access</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="badge bg-[#e8eef4] text-[#4a6b8a]">Caregiver</span>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Updates tasks, verifies medications, logs health observations</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="badge bg-[#f5ede5] text-[#a07c4a]">Family</span>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Stays informed with read-only access to care information</p>
            </li>
          </ul>
        </section>

        {/* Privacy */}
        <section className="card !p-6 md:!p-8 mb-6">
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-3">Built for caregiver privacy from day one</h2>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
            Sharing health information with family shouldn&apos;t mean sharing it with everyone. Care Circle uses invite-only circles, so a person sees information only after they&apos;ve been invited — and access can be changed as care changes.
          </p>
        </section>

        {/* Safeguards */}
        <section className="card !p-6 md:!p-8 mb-6">
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-4">Privacy safeguards, logged and verifiable</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#4a7c7e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Role-based access control for coordinators, caregivers, and family</p>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#4a7c7e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Every change recorded in an audit log with before/after history</p>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#4a7c7e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Consent tracked before information is shared</p>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#4a7c7e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Encrypted connections; credentials stored as secure hashes</p>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#4a7c7e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Signed sessions with automatic expiry</p>
            </li>
          </ul>
        </section>

        {/* Audit + CTA */}
        <section className="card !p-6 md:!p-8">
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-3">Every change, on the record</h2>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-4">
            Updates to care information are recorded in an audit log with before/after history, so your circle always has a trustworthy record.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/features/audit/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors"
            >
              See the audit log
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
            </Link>
            <Link
              href="/features/cases/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors"
            >
              Start your family&apos;s care circle
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
