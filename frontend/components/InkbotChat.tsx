'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CHAT_TITLE, disclaimer, promptSets } from '@/lib/chatKnowledge';
import {
  createMessage,
  getWelcomeMessage,
  sendChatMessage,
  type ChatMessage,
} from '@/lib/chatClient';

/* ─── Tiny helpers ───────────────────────────────────────────────────── */

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getOrCreateSessionId(): string {
  try {
    let id = window.sessionStorage.getItem('inkbot-chat-session');
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem('inkbot-chat-session', id);
    }
    return id;
  } catch {
    return `anon-${Date.now().toString(36)}`;
  }
}

/* ─── Guided care-plan intake ────────────────────────────────────────── */

type IntakeStep = 'challenge' | 'firstName' | 'lastName' | 'problem' | 'contact' | 'done';

interface IntakeState {
  step: IntakeStep;
  firstName?: string;
  lastName?: string;
  problem?: string;
  contact?: string;
  challenge?: string;
  challengeAnswer?: string;
}

/** Tailored first question per inferred challenge (Google Ads keyword/UTM). */
const CHALLENGE_QUESTIONS: Record<string, string> = {
  'reducing readmissions': "What's driving your readmissions right now?",
  'medication management': 'What is your biggest medication-management challenge?',
  'care plan & task coordination': 'Where does care coordination break down for your agency?',
  'CMS compliance & star ratings': 'Which compliance or star-rating area is the biggest pain point?',
  'post-discharge follow-up': 'Where do follow-ups fall through the cracks?',
  'family communication & callbacks': 'What\u2019s the biggest source of family callbacks?',
};

const DEFAULT_CHALLENGE_QUESTION =
  'What is the biggest challenge for your home health agency right now?';

/** Platform benefits shown in the chat's initial state — visible without clicking. */
const BENEFITS = [
  { icon: '📋', title: 'Shared care plans', desc: 'One plan for family, facility & caregivers', href: '/features/cases/' },
  { icon: '💊', title: 'Medication tracking', desc: 'Doses, schedules & verification', href: '/features/medications/' },
  { icon: '✅', title: 'Task coordination', desc: 'Assign & track daily care tasks', href: '/features/tasks/' },
  { icon: '📞', title: 'Follow-up & reminders', desc: '30-day check-in cadence', href: '/features/follow-ups/' },
  { icon: '🔒', title: 'HIPAA-aware & audited', desc: 'Role-based access, full audit trail', href: '/features/audit/' },
  { icon: '🏥', title: 'Built for agencies', desc: 'Fewer callbacks, lower readmissions', href: '/professional/' },
];

/**
 * Infer the visitor's biggest challenge from the Google Ads referral:
 * ad group/keyword (utm_content/utm_term/utm_campaign), gclid landing
 * path, or page path. Returns a short human label, or null.
 */
function detectChallenge(): string | null {
  try {
    const source =
      window.location.search + ' ' + document.referrer + ' ' + window.location.pathname;
    const s = source.toLowerCase();
    const map: [RegExp, string][] = [
      [/readmission|readmit|3-?7-?14-?30|hospitaliz/, 'reducing readmissions'],
      [/medication|med error|medication-?track/, 'medication management'],
      [/care plan|coordinat|task/, 'care plan & task coordination'],
      [/complian|cms|audit|survey|star rating/, 'CMS compliance & star ratings'],
      [/follow-?up/, 'post-discharge follow-up'],
      [/family|callback|call.?back|communicat/, 'family communication & callbacks'],
    ];
    for (const [re, label] of map) if (re.test(s)) return label;
  } catch {
    /* ignore */
  }
  return null;
}

/** Advance the intake state machine and produce the bot's next question. */
function advanceIntake(s: IntakeState, answer: string): {
  state: IntakeState;
  question: string;
  links?: { href: string; label: string }[];
} {
  const clean = answer.trim();
  switch (s.step) {
    case 'challenge':
      return {
        state: { ...s, step: 'firstName', challengeAnswer: clean },
        question: `Got it. Let's start the care plan — what's your patient's first name?`,
      };
    case 'firstName':
      return {
        state: { ...s, step: 'lastName', firstName: clean },
        question: `Great — and their last name?`,
      };
    case 'lastName':
      return {
        state: { ...s, step: 'problem', lastName: clean },
        question: s.challenge
          ? `Thanks, ${s.firstName ?? 'there'}. Beyond ${s.challenge}, is there another priority for ${s.firstName ?? 'them'} right now?`
          : `Thanks, ${s.firstName ?? 'there'}. What's the primary problem or challenge right now? (e.g. recovering from surgery, medication confusion, fall risk…)`,
      };
    case 'problem':
      return {
        state: { ...s, step: 'contact', problem: clean },
        question: `Got it. Who's the main family contact we should keep in the loop? (Name, or type "skip")`,
      };
    case 'contact':
      return {
        state: { ...s, step: 'done', contact: clean.toLowerCase() === 'skip' ? undefined : clean },
        question:
          `Here's the care plan intake so far:\n\n` +
          `👤 Patient: ${s.firstName ?? '—'} ${s.lastName ?? ''}\n` +
          `🎯 Focus: ${s.problem && s.problem.toLowerCase() !== 'none' ? s.problem : s.challengeAnswer ?? s.challenge ?? '—'}\n` +
          `📞 Contact: ${clean.toLowerCase() === 'skip' ? '—' : clean}\n\n` +
          `I've noted it — when you start the care plan, these details carry over. Anything else I can help with?`,
        links: [{ href: '/features/cases/', label: 'Start the care plan' }],
      };
    default:
      return { state: s, question: '' };
  }
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = window.sessionStorage.getItem('inkbot-chat-history');
    if (raw) {
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [getWelcomeMessage()];
}

function saveHistory(messages: ChatMessage[]) {
  try {
    window.sessionStorage.setItem('inkbot-chat-history', JSON.stringify(messages.slice(-60)));
  } catch {
    /* ignore */
  }
}

/* ─── Typing indicator ───────────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <AgentAvatar />
      <div className="bg-white border border-[var(--color-border)] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function AgentAvatar({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  return (
    <span
      className={`${cls} shrink-0 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-sm`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size === 'lg' ? 20 : 16} height={size === 'lg' ? 20 : 16} fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </span>
  );
}

function MessageLinks({ links }: { links: NonNullable<ChatMessage['links']> }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full bg-[#fbeedf] text-[var(--color-accent)] hover:bg-[#f6e0c8] hover:text-[var(--color-secondary)] no-underline transition-colors"
        >
          {l.label}
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      ))}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────── */

export default function InkbotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [expanded, setExpandedState] = useState(false);
  // Restore the persisted maximize state AFTER hydration (never in the useState
  // initializer — reading sessionStorage there causes a hydration mismatch and
  // breaks the component on reload).
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('inkbot-chat-expanded') === '1') {
        setExpandedState(true);
      }
    } catch {
      /* ignore */
    }
  }, []);
  const setExpanded = useCallback((next: boolean | ((p: boolean) => boolean)) => {
    setExpandedState((prev) => {
      const v = typeof next === 'function' ? (next as (p: boolean) => boolean)(prev) : next;
      try {
        window.sessionStorage.setItem('inkbot-chat-expanded', v ? '1' : '0');
      } catch {
        /* ignore */
      }
      return v;
    });
  }, []);
  const [sessionId] = useState<string>(() =>
    typeof window === 'undefined' ? 'server' : getOrCreateSessionId(),
  );
  const [intake, setIntake] = useState<IntakeState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Lock page scroll while the chat is expanded to full screen.
  useEffect(() => {
    if (expanded) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [expanded]);

  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Keep the newest message in view — but while there's only the welcome
  // message (≤ 1 message) stay pinned to the TOP so the welcome and benefits
  // are the first thing users see, instead of the bottom of the bubble.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (messages.length <= 1 && !typing) {
      el.scrollTop = 0;
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  // After the bot asks a question, put the cursor in the answer field so
  // leaders can reply immediately (esp. during the guided intake flow).
  useEffect(() => {
    if (typing) return;
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant' && /[?？]\s*$/.test(last.content)) {
      inputRef.current?.focus();
    }
  }, [messages, typing]);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || typing) return;

      setInput('');
      setMessages((prev) => [...prev, createMessage('user', text)]);

      // Guided intake: handled locally so it works in demo AND connected mode.
      if (intake && intake.step !== 'done') {
        const { state, question, links } = advanceIntake(intake, text);
        setIntake(state);
        setTyping(true);
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 350));
        setMessages((prev) => [...prev, createMessage('assistant', question, links)]);
        setTyping(false);
        inputRef.current?.focus();
        return;
      }

      setTyping(true);

      try {
        const { reply, links } = await sendChatMessage(text, sessionId);
        setMessages((prev) => [...prev, createMessage('assistant', reply, links)]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          createMessage(
            'assistant',
            `Sorry — I couldn't reach the chat service just now. Please try again in a moment. (${err instanceof Error ? err.message : 'Unknown error'})`,
          ),
        ]);
      } finally {
        setTyping(false);
        inputRef.current?.focus();
      }
    },
    [input, typing, sessionId, intake],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const showPrompts = messages.length <= 1 && !typing;

  return (
    <div
      className={`flex flex-col h-full bg-white border border-[var(--color-border)] shadow-md overflow-hidden transition-[border-radius,box-shadow] duration-200 ${
        expanded
          ? 'fixed inset-0 z-[70] h-[100dvh] rounded-none border-0 shadow-none'
          : 'rounded-[var(--radius-lg)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-5 py-3.5 border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)]">
        <AgentAvatar size="lg" />
        <div className="min-w-0">
          <p className="font-extrabold text-[var(--color-text)] leading-tight">{CHAT_TITLE}</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#065f46] bg-[#d1fae5] px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          Online
        </span>
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          aria-label={expanded ? 'Minimize chat' : 'Expand chat to full screen'}
          className="ml-2 inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)] bg-white text-[var(--color-primary)] hover:bg-[#faf7f3] hover:text-[var(--color-secondary)] transition-colors"
        >
          {expanded ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
            </svg>
          )}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-5 py-5 space-y-4 bg-[var(--color-bg)]">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[95%] md:max-w-[90%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-4 py-3 text-[0.9375rem] leading-relaxed shadow-sm whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[var(--color-primary)] text-white rounded-2xl rounded-br-md'
                      : 'bg-white border border-[var(--color-border)] rounded-2xl rounded-bl-md'
                  }`}
                >
                  {m.content}
                </div>
                {m.links && m.links.length > 0 && <MessageLinks links={m.links} />}
                <span className={`mt-1 text-[0.68rem] text-[var(--color-text-light)] ${isUser ? 'text-right' : ''}`}>
                  {formatTime(m.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
        {typing && <TypingIndicator />}
      </div>

      {/* Suggested prompts */}
      {showPrompts && (
        <div className="px-4 md:px-5 pt-3 bg-white">
          {/* Platform benefits — visible immediately, no clicks required */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {BENEFITS.map((b) => (
              <Link
                key={b.title}
                href={b.href}
                onClick={() => setExpanded(true)}
                className="group flex flex-col gap-0.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 no-underline transition-colors hover:border-[var(--color-accent)] hover:bg-[#fbeedf]"
              >
                <span className="text-base leading-none" aria-hidden="true">{b.icon}</span>
                <span className="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-secondary)]">{b.title}</span>
                <span className="text-[0.65rem] leading-snug text-[var(--color-text-light)]">{b.desc}</span>
              </Link>
            ))}
          </div>
          {/* Primary starter — always opens with the agency's biggest challenge
              (tailored to the ad term/referral when known) */}
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              const challenge = detectChallenge();
              // First question is agency-focused: the inferred ad/referral
              // challenge when known, otherwise the general agency challenge.
              setIntake({ step: 'challenge', challenge: challenge ?? undefined });
              setMessages((prev) => [
                ...prev,
                createMessage('assistant', CHALLENGE_QUESTIONS[challenge ?? ''] ?? DEFAULT_CHALLENGE_QUESTION),
              ]);
              inputRef.current?.focus();
            }}
            className="btn btn-primary !py-2 !px-4 text-sm mb-3"
          >
            <span className="inline-flex items-center gap-2">
              What&apos;s your agency&apos;s biggest challenge?
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
          </button>

          {/* Less prominent topic quick-questions */}
          <div className="flex flex-wrap gap-2">
            {([
              ['improve care plans', 'How does Assistedly help agencies improve care plans?'],
              ['medication management', 'How does Assistedly help with medication management?'],
              ['task management', 'How does Assistedly help with task management?'],
              ['follow-up', 'How does Assistedly help with patient follow-up?'],
              ['stay compliant', 'How does Assistedly help agencies stay compliant?'],
            ] as [string, string][]).map(([label, question]) => (
              <button
                key={label}
                type="button"
                onClick={() => { setExpanded(true); send(question); }}
                className="text-xs font-semibold px-3 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-light)] hover:border-[var(--color-accent)] hover:bg-[#fbeedf] hover:text-[var(--color-secondary)] transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="px-4 md:px-5 py-3.5 border-t border-[var(--color-border)] bg-white">
        <div className="flex items-end gap-2.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Ask Assistedly Cares…"
            aria-label="Message the Assistedly Cares concierge"
            className="resize-none max-h-44 flex-1 !mb-0"
            style={{ minHeight: '4.5rem' }}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={!input.trim() || typing}
            aria-label="Send message"
            className="btn !p-0 w-12 h-12 shrink-0 rounded-full !bg-[#16a34a] hover:!bg-[#15803d] text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.5 4.5 21 12 3.5 19.5 6 12zm0 0h9" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-[0.68rem] leading-relaxed text-[var(--color-text-light)]">{disclaimer}</p>
      </div>
    </div>
  );
}