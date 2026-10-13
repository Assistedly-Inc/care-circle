'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, AuthSession, MfaChallenge, isMfaChallenge } from '@/lib/api';

function SignInCard() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error' | 'mfa' | 'setup'>('idle');
  const [message, setMessage] = useState('');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [code, setCode] = useState('');
  // SMS enrollment (shown when a privileged role has no MFA yet)
  const [setupPhone, setSetupPhone] = useState('');
  const [setupStep, setSetupStep] = useState<'phone' | 'code'>('phone');
  const [setupCode, setSetupCode] = useState('');

  const showSuccess = (s: AuthSession, prefix: string) => {
    setSession(s);
    setStatus('done');
    setMessage(
      s.created
        ? `${prefix} ${s.user.email}${s.user.name ? ` (${s.user.name})` : ''} — you're signed in. Your session lasts 12 hours — open a feature page to get started.`
        : `Signed in as ${s.user.email}${s.user.name ? ` (${s.user.name})` : ''}. Your session lasts 12 hours — open a feature page to get started.`
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setMessage('');
    try {
      const result = await auth.passwordlessSignIn(email.trim());
      if (isMfaChallenge(result)) {
        setChallenge(result);
        setCode('');
        setStatus('mfa');
        return;
      }
      showSuccess(result, 'New account created for');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Sign-in failed');
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || !/^\d{6}$/.test(code)) return;
    setStatus('sending');
    setMessage('');
    try {
      const s = await auth.mfaVerify(challenge.challengeToken, code);
      showSuccess(s, 'Account created for');
    } catch (err) {
      setStatus('mfa');
      setMessage(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  async function handleMfaResend() {
    if (!challenge) return;
    setStatus('sending');
    setMessage('');
    try {
      const r = await auth.mfaResend(challenge.challengeToken);
      setStatus('mfa');
      setMessage(`A new code was texted to ${r.maskedPhone}.`);
    } catch (err) {
      setStatus('mfa');
      setMessage(err instanceof Error ? err.message : 'Could not resend the code');
    }
  }

  async function handleSetupSend(e: React.FormEvent) {
    e.preventDefault();
    if (!setupPhone.trim()) return;
    setStatus('sending');
    setMessage('');
    try {
      const r = await auth.mfaSetup(setupPhone.trim());
      setSetupStep('code');
      setSetupCode('');
      setStatus('setup');
      setMessage(`Verification code sent to ${r.maskedPhone}.`);
    } catch (err) {
      setStatus('setup');
      setMessage(err instanceof Error ? err.message : 'Setup failed');
    }
  }

  async function handleSetupVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(setupCode)) return;
    setStatus('sending');
    setMessage('');
    try {
      await auth.mfaVerifySetup(setupCode, setupPhone.trim());
      setStatus('done');
      setMessage('SMS verification enabled — future sign-ins will ask for a code from your phone.');
    } catch (err) {
      setStatus('setup');
      setMessage(err instanceof Error ? err.message : 'Setup failed');
    }
  }

  // Magic-link landing: a confirmation/sign-in email points here with ?token=.
  // Verify it on load and swap the token for a real session (or an MFA challenge).
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) return;
    let cancelled = false;
    setStatus('sending');
    (async () => {
      try {
        const result = await auth.passwordlessVerify(token);
        if (cancelled) return;
        // Don't leave the one-time token in the address bar.
        window.history.replaceState({}, '', window.location.pathname);
        if (isMfaChallenge(result)) {
          setChallenge(result);
          setCode('');
          setStatus('mfa');
          return;
        }
        showSuccess(result, 'Account confirmed for');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Sign-in failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const busy = status === 'sending';

  return (
    <section className="card !p-6 md:!p-8 mb-6 border border-[var(--color-accent)]/30">
      <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-2">Passwordless sign-in</h2>
      <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-4">
        Enter your email and we&apos;ll send you a sign-in link — no password needed. If your email isn&apos;t on a care-circle account yet, we&apos;ll create one for you.
      </p>

      {status === 'mfa' && challenge ? (
        <form onSubmit={handleMfaVerify} className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <input
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
            className="field flex-1"
          />
          <button type="submit" disabled={busy} className="btn btn-primary text-sm">
            {busy ? 'Verifying…' : 'Verify'}
          </button>
          <p className="text-xs text-[var(--color-text-light)] mt-1 sm:w-full">
            Enter the 6-digit code texted to {challenge.maskedPhone}. {challenge.smsSent ? '' : 'The code could not be sent — try again in a moment.'}
          </p>
          <button
            type="button"
            onClick={handleMfaResend}
            disabled={busy}
            className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] mt-2 self-start transition-colors"
          >
            Didn&apos;t get the code? Send it again
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <input
            required
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="field flex-1"
          />
          <button type="submit" disabled={busy} className="btn btn-primary text-sm">
            {busy ? 'Sending…' : 'Sign in with email'}
          </button>
        </form>
      )}

      {status === 'setup' && (
        <div className="mt-4 max-w-lg">
          {setupStep === 'phone' ? (
            <form onSubmit={handleSetupSend} className="flex flex-col sm:flex-row gap-3">
              <input
                required
                type="tel"
                value={setupPhone}
                onChange={e => setSetupPhone(e.target.value)}
                placeholder="+14155550123"
                className="field flex-1"
              />
              <button type="submit" disabled={busy} className="btn btn-primary text-sm">
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSetupVerify} className="flex flex-col sm:flex-row gap-3">
              <input
                required
                autoFocus
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={setupCode}
                onChange={e => setSetupCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit code"
                className="field flex-1"
              />
              <button type="submit" disabled={busy} className="btn btn-primary text-sm">
                {busy ? 'Verifying…' : 'Enable SMS verification'}
              </button>
            </form>
          )}
        </div>
      )}

      {status === 'done' && !session?.mfaSetupRequired && (
        <p className="mt-3 text-xs font-semibold text-[#065f46] bg-[#d1fae5] px-3 py-2 rounded-md inline-block">✓ {message}</p>
      )}
      {status === 'done' && session?.mfaSetupRequired && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-[#065f46] bg-[#d1fae5] px-3 py-2 rounded-md inline-block">✓ {message}</p>
          <div className="mt-3 card !p-4 border border-[var(--color-accent)]/20">
            <p className="text-sm font-bold text-[var(--color-text)] mb-1">Set up SMS verification (recommended)</p>
            <p className="text-xs text-[var(--color-text-light)] mb-3">
              Your role can access care information, so we ask you to secure the account with a phone number. Sign-in will then require a texted code.
            </p>
            <form onSubmit={handleSetupSend} className="flex flex-col sm:flex-row gap-3">
              <input
                required
                type="tel"
                value={setupPhone}
                onChange={e => setSetupPhone(e.target.value)}
                placeholder="+14155550123"
                className="field flex-1"
              />
              <button type="submit" disabled={busy} className="btn btn-primary text-sm">
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
            {setupStep === 'code' && (
              <form onSubmit={handleSetupVerify} className="flex flex-col sm:flex-row gap-3 mt-3">
                <input
                  required
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={setupCode}
                  onChange={e => setSetupCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  className="field flex-1"
                />
                <button type="submit" disabled={busy} className="btn btn-primary text-sm">
                  {busy ? 'Verifying…' : 'Enable SMS verification'}
                </button>
              </form>
            )}
            <p className="mt-2 text-xs text-[var(--color-text-light)]">{message}</p>
          </div>
        </div>
      )}
      {status === 'error' && (
        <p className="mt-3 text-xs font-semibold text-[#991b1b] bg-[#fef2f2] px-3 py-2 rounded-md inline-block">{message}</p>
      )}
    </section>
  );
}

export default function AuthFeaturePage() {
  return (
    <div className="pb-16">
      <div className="container max-w-4xl py-10 md:py-14">
        <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
          The right information, for the right people, at the right time
        </h1>
        <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed mb-10">
          Assistedly Cares is built on a simple promise: everyone in your circle — relatives, caregivers, and care coordinators — gets exactly the information they need, and nothing they don&apos;t. Privacy isn&apos;t a feature bolted on at the end; it&apos;s how the product works.
        </p>

        <SignInCard />

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
            Sharing health information with family shouldn&apos;t mean sharing it with everyone. Assistedly Cares uses invite-only circles, so a person sees information only after they&apos;ve been invited — and access can be changed as care changes.
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
