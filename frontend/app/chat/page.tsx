import type { Metadata } from 'next';
import InkbotChat from '@/components/InkbotChat';

export const metadata: Metadata = {
  title: 'Ask Assistedly Cares',
  description:
    "Stay up to date and compliant. Track patients' health, medications & more on the go — ask questions in plain language about care plans, medications, tasks, follow-ups, export, compliance, privacy, and more.",
};

export default function ChatPage() {
  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">
              Stay Up to Date and Compliant
            </p>
            <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
              Track Patients&apos; Health, Medications &amp; More On the Go
            </h1>
            <p className="text-[var(--color-text-light)] leading-relaxed">
              Ask questions in plain language about care plans, medications, tasks, follow-ups, export,
              compliance, privacy, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Chat */}
      <section className="container mt-6 md:mt-8">
        <div className="mx-auto max-w-4xl h-[clamp(600px,calc(100dvh-240px),900px)]">
          <InkbotChat />
        </div>
      </section>
    </div>
  );
}