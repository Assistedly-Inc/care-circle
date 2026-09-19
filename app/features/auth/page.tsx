'use client';

import Link from 'next/link';

export default function AuthFeaturePage() {
  return (
    <div className="pb-16">
      <div className="container max-w-4xl py-10 md:py-14">
        <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
          Authentication &amp; Role-Based Access
        </h1>
        <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed mb-10">
          Care Circle uses role-based access control. In the Cloudflare Workers backend, access is currently open for demo purposes.
        </p>

        {/* Role Middleware */}
        <section className="card !p-6 md:!p-8 mb-6">
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-6">Role Middleware Architecture</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#e8f4ef] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[#4a7c7e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75Z" />
                  </svg>
                </div>
                <h3 className="font-bold text-[var(--color-text)]">requireAuth</h3>
              </div>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
                Require valid JWT on protected routes. Currently returns demo token for any credentials.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#ede8f2] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[#6a5290]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751" />
                  </svg>
                </div>
                <h3 className="font-bold text-[var(--color-text)]">requireRole</h3>
              </div>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
                Enforce role-based access (Coordinator, Caregiver, Family). Implemented in backend middleware.
              </p>
            </div>
          </div>
        </section>

        {/* Supported Roles */}
        <section className="card !p-6 md:!p-8 mb-6">
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-6">Supported Roles</h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="badge bg-[#e8f4ef] text-[#4a7c7e]">Coordinator</span>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Full read/write access, can create cases, assign members</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="badge bg-[#e8eef4] text-[#4a6b8a]">Caregiver</span>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Can update tasks, verify medications, log health observations</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="badge bg-[#f5ede5] text-[#a07c4a]">Family</span>
              <p className="text-sm text-[var(--color-text-light)] leading-relaxed">Read-only access to care profiles, export data</p>
            </li>
          </ul>
        </section>

        {/* Audit Middleware */}
        <section className="card !p-6 md:!p-8">
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-3">Audit Middleware</h2>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-4">
            Every action is logged with before/after snapshots via KV storage.
          </p>
          <Link
            href="/features/audit/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors"
          >
            See the Audit page for live audit logs
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
          </Link>
        </section>
      </div>
    </div>
  );
}
