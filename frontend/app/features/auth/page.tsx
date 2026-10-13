'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { auth, AuthSession, MfaChallenge, isMfaChallenge } from '@/lib/api';

// One-tap SMS opt-in (US 10DLC): opens the phone's messaging app pre-filled
// with START to our Inkbox number. Mirrors the link in the verification email.
const SMS_OPT_IN_LINK = 'sms:14133509016?body=START';
const SMS_OPT_IN_NUMBER = '14133509016';

type Tone = 'info' | 'success' | 'error';
type Step = 'email' | 'mfa' | 'setup' | 'done';
type SetupStep = 'phone' | 'code';

function StepLabel({ n, total, label }: { n: number; total: number; label: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)] mb-1">
      Step {n} of {total} · {label}
    </p>
  );
}

function StatusLine({ tone, children }: { tone: Tone; children: ReactNode }) {
  const styles: Record<Tone, string> = {
    info: 'text-[var(--color-text-light)]',
    success: 'text-[#065f46]',
    error: 'text-[#991b1b] font-medium',
  };
  return (
    <p className={`text-sm leading-relaxed mt-3 ${styles[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'success' ? '✓ ' : ''}
      {children}
    </p>
  );
}

function SignInCard() {
  // Single progressive flow: email → (code if MFA) → (phone setup if required) → done.
  const [step, setStep] = useState<Step>('email');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: Tone; text: ReactNode } | null>(null);

  const [email, setEmail] = useState('');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [code, setCode] = useState('');

  // SMS enrollment (shown when a privileged role has no MFA yet)
  const [setupPhone, setSetupPhone] = useState('');
  const [setupStep, setSetupStep] = useState<SetupStep>('phone');
  const [setupCode, setSetupCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [mfaChannel, setMfaChannel] = useState<'sms' | 'email'>('sms');

  const showSuccess = (s: AuthSession) => {
    // Fire the Google Ads conversion event on successful passwordless sign-in
    // (fires for both new-account and returning-user paths, incl. MFA flow).
    try {
      const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
      if (Array.isArray(w.dataLayer)) {
        w.dataLayer.push({ event: 'generate_lead', lead_source: 'magic_link_signup', email: s.user.email });
      }
    } catch {
      // tracking must never break sign-in
    }
    setSession(s);
    // Step 2 (two-step enrollment) is removed for now — SMS can't be completed
    // while the carrier verification is unavailable. Re-enable by routing
    // mfaSetupRequired to the 'setup' step again.
    setStep('done');
    setMessage({
      tone: 'success',
      text: s.created
        ? `New account created for ${s.user.email} — you're signed in.`
        : `Signed in as ${s.user.email}${s.user.name ? ` (${s.user.name})` : ''}.`,
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await auth.passwordlessSignIn(email.trim());
      if (isMfaChallenge(result)) {
        setChallenge(result);
        setCode('');
        setStep('mfa');
        return;
      }
      showSuccess(result);
    } catch (err) {
      setStep('email');
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Sign-in failed' });
    } finally {
      setBusy(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || !/^\d{6}$/.test(code) || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const s = await auth.mfaVerify(challenge.challengeToken, code);
      showSuccess(s);
    } catch (err) {
      setStep('mfa');
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Verification failed' });
    } finally {
      setBusy(false);
    }
  }

  async function handleMfaResend() {
    if (!challenge || busy || resendCooldown > 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await auth.mfaResend(challenge.challengeToken, mfaChannel);
      setStep('mfa');
      setResendCooldown(30);
      setMessage({
        tone: 'info',
        text: r.deliveryChannel === 'email' ? `A new code was emailed to ${r.maskedEmail}.` : `A new code was texted to ${r.maskedPhone}.`,
      });
    } catch (err) {
      setStep('mfa');
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not resend the code' });
    } finally {
      setBusy(false);
    }
  }

  // User toggled between SMS and email delivery — resend on the chosen channel.
  async function handleMfaChannelChange(channel: 'sms' | 'email') {
    if (!challenge || channel === mfaChannel || busy) return;
    setMfaChannel(channel);
    setBusy(true);
    setMessage(null);
    try {
      const r = await auth.mfaResend(challenge.challengeToken, channel);
      setChallenge(c => (c ? { ...c, maskedPhone: r.maskedPhone, maskedEmail: r.maskedEmail, deliveryChannel: r.deliveryChannel, smsSent: r.smsSent } : c));
      setResendCooldown(30);
      setMessage({ tone: 'info', text: r.deliveryChannel === 'email' ? `A new code was emailed to ${r.maskedEmail}.` : `A new code was texted to ${r.maskedPhone}.` });
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not send the code that way' });
    } finally {
      setBusy(false);
    }
  }

  async function handleSetupSend(e: React.FormEvent) {
    e.preventDefault();
    if (!setupPhone.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await auth.mfaSetup(setupPhone.trim());
      setSetupStep('code');
      setSetupCode('');
      setStep('setup');
      setMessage(
        r.deliveryChannel === 'email'
          ? {
              tone: 'info',
              text: (
                <>
                  Verification code emailed to {r.maskedEmail}. Want codes by text instead?{' '}
                  <a href={SMS_OPT_IN_LINK} className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                    Text START to {SMS_OPT_IN_NUMBER}
                  </a>{' '}
                  from your phone — it opens your messaging app ready to send.
                </>
              ),
            }
          : { tone: 'info', text: `Verification code sent to ${r.maskedPhone}. Enter it below.` }
      );
    } catch (err) {
      setStep('setup');
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Setup failed' });
    } finally {
      setBusy(false);
    }
  }

  // Optional enrollment: let users proceed without two-step for now.
  function handleSkipSetup() {
    setSession(s => (s ? { ...s, mfaSetupRequired: false } : s));
    setStep('done');
    setMessage({ tone: 'info', text: 'You can enable two-step verification anytime from the sign-in page.' });
  }

  async function handleSetupVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(setupCode) || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await auth.mfaVerifySetup(setupCode, setupPhone.trim());
      setSession(s => (s ? { ...s, mfaSetupRequired: false } : s));
      setStep('done');
      setMessage({
        tone: 'success',
        text: 'Two-step verification is on. Future sign-ins will ask for a code sent to your phone.',
      });
    } catch (err) {
      setStep('setup');
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Setup failed' });
    } finally {
      setBusy(false);
    }
  }

  // Magic-link landing: a confirmation/sign-in email points here with ?token=.
  // Verify it on load and swap the token for a real session (or an MFA challenge).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const resend = params.get('resend');
    if (!token && !resend) return;
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        // "Text me the code instead" link from the verification email.
        if (resend) {
          const r = await auth.mfaResend(resend);
          if (cancelled) return;
          // Don't leave the resend token in the address bar.
          window.history.replaceState({}, '', window.location.pathname);
          setChallenge({ mfaRequired: true, challengeToken: resend, expiresIn: 300, maskedPhone: r.maskedPhone, maskedEmail: r.maskedEmail, deliveryChannel: r.deliveryChannel, smsSent: r.smsSent });
          setCode('');
          setStep('mfa');
          setMessage({ tone: 'info', text: r.deliveryChannel === 'email' ? `We emailed a new code to ${r.maskedEmail}.` : `A new code was texted to ${r.maskedPhone}.` });
          return;
        }
        const result = await auth.passwordlessVerify(token as string);
        if (cancelled) return;
        // Don't leave the one-time token in the address bar.
        window.history.replaceState({}, '', window.location.pathname);
        if (isMfaChallenge(result)) {
          setChallenge(result);
          setCode('');
          setStep('mfa');
          return;
        }
        showSuccess(result);
      } catch (err) {
        if (cancelled) return;
        setStep('email');
        setMessage({ tone: 'error', text: 'This sign-in link is invalid or has expired. Enter your email to request a new one.' });
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Countdown before the "resend code" link is re-enabled.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  return (
    <section className="card !p-6 md:!p-8 mb-6 border border-[var(--color-accent)]/30">
      {step === 'email' && (
        <>
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-2">Passwordless sign-in</h2>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-4">
            Enter your email and we&apos;ll send you a sign-in link — no password needed. If your email isn&apos;t on a Assistedly Cares account yet, we&apos;ll create one for you.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field flex-1"
            />
            <button type="submit" disabled={busy} className="btn btn-primary text-sm">
              {busy ? 'Sending…' : 'Sign in with email'}
            </button>
          </form>
          {message && <StatusLine tone={message.tone}>{message.text}</StatusLine>}
        </>
      )}

      {step === 'mfa' && challenge && (
        <>
          <StepLabel n={2} total={2} label="Verify your code" />
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-2">Enter your code</h2>
          <div className="mb-4 max-w-lg" role="group" aria-label="How would you like to receive your code?">
            <div className="flex rounded-lg overflow-hidden border border-[var(--color-accent)]/30 w-fit">
              <button
                type="button"
                onClick={() => handleMfaChannelChange('sms')}
                disabled={busy}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mfaChannel === 'sms' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-light)] hover:text-[var(--color-text)]'}`}
              >
                📱 Text me a code
              </button>
              <button
                type="button"
                onClick={() => handleMfaChannelChange('email')}
                disabled={busy}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mfaChannel === 'email' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-light)] hover:text-[var(--color-text)]'}`}
              >
                ✉️ Email me a code
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-light)] mt-2">
              {challenge.deliveryChannel === 'email'
                ? `We emailed the code to ${challenge.maskedEmail}. Switch to SMS if you'd rather get texts.`
                : `We texted the code to ${challenge.maskedPhone}. Switch to email if you'd rather get it there.`}
            </p>
          </div>
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
              placeholder="••••••"
              className="field flex-1 text-center text-lg tracking-[0.4em]"
            />
            <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary text-sm">
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </form>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 max-w-lg">
            <button
              type="button"
              onClick={handleMfaResend}
              disabled={busy || resendCooldown > 0}
              className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Didn\u2019t get the code? Send it again'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setChallenge(null);
                setCode('');
                setMessage(null);
              }}
              className="text-xs font-medium text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors"
            >
              Not you? Use a different email
            </button>
          </div>
          {message && <StatusLine tone={message.tone}>{message.text}</StatusLine>}
        </>
      )}

      {step === 'setup' && (
        <>
          <StepLabel n={2} total={2} label="Two-step verification" />
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-2">Secure your account</h2>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-4">
            Your role can access care information, so we ask you to add a phone number. We&apos;ll text a code to verify you own it, and sign-in will then require a code from this phone. If your phone hasn&apos;t texted START to 14133509016 yet, do that first so it can receive codes.
          </p>
          {setupStep === 'phone' ? (
            <form onSubmit={handleSetupSend} className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={setupPhone}
                onChange={e => setSetupPhone(e.target.value)}
                placeholder="(617) 123-4567"
                className="field flex-1"
              />
              <button type="submit" disabled={busy} className="btn btn-primary text-sm">
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSetupVerify} className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <input
                required
                autoFocus
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={setupCode}
                onChange={e => setSetupCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="field flex-1 text-center text-lg tracking-[0.4em]"
              />
              <button type="submit" disabled={busy || setupCode.length !== 6} className="btn btn-primary text-sm">
                {busy ? 'Verifying…' : 'Enable two-step verification'}
              </button>
            </form>
          )}
          <p className="text-xs text-[var(--color-text-light)] mt-2 max-w-lg">
            US numbers work with or without +1 — e.g. 617-500-3450.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 max-w-lg">
            {setupStep === 'code' && (
              <button
                type="button"
                onClick={() => setSetupStep('phone')}
                className="text-xs font-medium text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors"
              >
                ← Use a different phone number
              </button>
            )}
            <button
              type="button"
              onClick={handleSkipSetup}
              className="text-xs font-semibold text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors"
            >
              Skip for now — enable later
            </button>
          </div>
          {message && <StatusLine tone={message.tone}>{message.text}</StatusLine>}
        </>
      )}

      {step === 'done' && session && (
        <div className="rounded-xl bg-[#d1fae5] border border-[#065f46]/25 p-5 md:p-6">
          <p className="flex items-center gap-2 text-base font-extrabold text-[#065f46]">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            You&apos;re signed in
          </p>
          {message && <p className="mt-1 text-sm text-[#065f46] leading-relaxed">{message.text}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href="/features/cases/" className="btn btn-primary btn-sm">
              Continue to your care circle
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <span className="text-xs text-[#065f46]">Your session lasts 12 hours.</span>
          </div>
        </div>
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