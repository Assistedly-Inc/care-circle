/**
 * Inkbot chat client.
 *
 * Two modes:
 *  1. Connected mode — when NEXT_PUBLIC_CHAT_API_URL is set, messages are sent
 *     to the chat Worker, which relays them over the Inkbox A2A ledger
 *     ("Inkbot Messages") to the Assistedly agent and returns its reply.
 *  2. Demo mode — otherwise the page answers locally from the gathered
 *     assistedly.ai knowledge base (lib/chatKnowledge.ts) so the chat works
 *     today as a static page with no backend.
 */

import {
  AGENT_NAME,
  knowledge,
  SMS_DISPLAY,
  SMS_NUMBER,
  welcomeMessage,
  fallbackMessage,
  fallbackTopics,
  getEntryById,
  type KnowledgeEntry,
} from './chatKnowledge';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Extra links shown under an assistant bubble. */
  links?: { href: string; label: string }[];
  timestamp: number;
}

export interface ChatSource {
  id: string;
  topic: string;
}

export interface ChatReply {
  reply: string;
  links?: { href: string; label: string }[];
  sources?: ChatSource[];
}

const API_URL = process.env.NEXT_PUBLIC_CHAT_API_URL?.replace(/\/$/, '');

let counter = 0;
function nextId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function createMessage(
  role: ChatMessage['role'],
  content: string,
  links?: ChatMessage['links'],
): ChatMessage {
  return { id: nextId(), role, content, links, timestamp: Date.now() };
}

export function getWelcomeMessage(): ChatMessage {
  return createMessage('assistant', welcomeMessage);
}

/* ─── Connected mode ─────────────────────────────────────────────────── */

/**
 * Wire contract for the chat Worker (to be deployed alongside the Inkbox
 * A2A worker):
 *   POST {NEXT_PUBLIC_CHAT_API_URL}/api/chat
 *   { "message": string, "sessionId": string }
 *   → { "reply": string, "links"?: [...], "sources"?: [...] }
 */
async function sendToWorker(message: string, sessionId: string): Promise<ChatReply> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) {
    throw new Error(`Chat service unavailable (HTTP ${res.status})`);
  }
  const data = (await res.json()) as ChatReply;
  return {
    reply: data.reply,
    links: data.links,
    sources: data.sources,
  };
}

/* ─── Demo mode: local knowledge retrieval ───────────────────────────── */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does',
  'did', 'i', 'you', 'your', 'my', 'me', 'we', 'us', 'our', 'they', 'them',
  'it', 'its', 'this', 'that', 'these', 'those', 'of', 'in', 'on', 'at',
  'to', 'for', 'from', 'with', 'and', 'or', 'but', 'if', 'can', 'could',
  'would', 'should', 'will', 'what', 'which', 'how', 'when', 'where', 'who',
  'please', 'tell', 'about', 'about', 'have', 'has', 'like', 'want', 'need',
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s%'-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(text: string): string[] {
  return normalize(text).split(' ').filter((t) => t && !STOPWORDS.has(t));
}

/** Score how well an entry matches a question. */
function scoreEntry(entry: KnowledgeEntry, question: string, questionTokens: string[]): number {
  const q = normalize(question);
  let score = 0;

  // Exact keyword-phrase hits are the strongest signal.
  for (const kw of entry.keywords) {
    const k = normalize(kw);
    if (k.length > 2 && q.includes(k)) score += 4;
  }

  // Token overlap with topic + keywords.
  const searchable = normalize(`${entry.topic} ${entry.keywords.join(' ')}`);
  for (const t of questionTokens) {
    if (t.length <= 2) continue;
    if (searchable.includes(t)) score += 1.2;
  }

  // Topic words count a bit more.
  const topicTokens = tokens(entry.topic);
  for (const t of topicTokens) {
    if (t.length > 3 && questionTokens.includes(t)) score += 1.5;
  }

  return score;
}

interface IntentReply {
  reply: string;
  links?: { href: string; label: string }[];
  sources?: ChatSource[];
}

const INTENT_PATTERNS: { pattern: RegExp; reply: IntentReply }[] = [
  {
    pattern: /\b(sms|start sms|text chat|text message|texting|text us|hipaa[ -]?compliant chat|private chat)\b/,
    reply: {
      reply:
        `Private, HIPAA-compliant SMS chat is ready — and it runs over Inkbox, the concierge's secure messaging line. ` +
        `From your phone, text START to ${SMS_DISPLAY}. That opts you in (Inkbox's consent registry), and then we can ` +
        `keep the conversation going over SMS about care plans, medications, tasks, and follow-ups. ` +
        `Your number is only used for your care chat — never sold or shared.`,
      links: [
        { href: `sms:${SMS_NUMBER}?&body=START`, label: `Text START to ${SMS_DISPLAY}` },
        { href: '/features/notifications/', label: 'Reminders & alerts' },
      ],
      sources: [{ id: 'overview', topic: 'SMS chat with the concierge' }],
    },
  },
  {
    pattern: /^(hi|hello|hey|yo|howdy|good (morning|afternoon|evening))\b/,
    reply: {
      reply:
        `Hello! 👋 I'm ${AGENT_NAME}. ` +
        `Ask me anything about care plans, medications, tasks, follow-ups, facilities, privacy, or pricing — ` +
        `or just type a question about how assistedly.ai can help with the first 30 days after discharge.`,
    },
  },
  {
    pattern: /\b(thanks|thank you|thx|appreciate)\b/,
    reply: {
      reply:
        `You're welcome! I'm here whenever you have more questions about Assistedly Cares. ` +
        `If anything comes up later, you can also reach a human at support@assistedly.ai. 💙`,
    },
  },
  {
    pattern: /\b(who are you|what are you|your name|inkbot|are you a robot|are you ai|what can you do)\b/,
    reply: {
      reply:
        `I'm ${AGENT_NAME}. I answer questions about the Assistedly Cares platform: care plans, medications, ` +
        `tasks, health observations, reminders, follow-ups, export, audit, and compliance — plus pricing, privacy, ` +
        `and terms. Chats are private and HIPAA compliant. Ask me anything!`,
      sources: [{ id: 'overview', topic: 'What is Assistedly Cares' }],
    },
  },
  {
    pattern: /\b(patient'?s name|patient name|my patient|my mother|my dad|my father|my mom|my grandmother|my grandfather|who is my|my relative'?s)\b/,
    reply: {
      reply:
        `I can only share information from a care plan that you're authorized to access, and right now chat is in ` +
        `preview mode — it answers from the public assistedly.ai site, not from patient records. Sign in to your ` +
        `care plan dashboard to see a patient's name, medications, and tasks; access is role-based, audit-logged, ` +
        `and only authorized members of the care circle can view a plan.`,
      links: [
        { href: '/features/cases/', label: 'Your care plans' },
        { href: '/features/auth/', label: 'Access & security' },
      ],
      sources: [{ id: 'roles', topic: 'Role-based access & security' }],
    },
  },
  {
    pattern: /\b(sign in|log in|login|create account|register|invite|invitation)\b/,
    reply: {
      reply:
        `Accounts are role-based: a coordinator (facility staff) can invite family members, caregivers, and ` +
        `outside providers to a care plan, each with the right permissions — families read-only, caregivers can ` +
        `update tasks/medications/health, coordinators get full access. Invitations carry the role, and access can ` +
        `be revoked instantly. Visit the access & security page or start a care plan to get going.`,
      links: [
        { href: '/features/auth/', label: 'Access & security' },
        { href: '/features/cases/', label: 'Start a care plan' },
      ],
      sources: [{ id: 'roles', topic: 'Role-based access & security' }],
    },
  },
];

/** Answer in demo mode. Returns null when the intent/retrieval layer can't help. */
export function demoAnswer(message: string): ChatReply | null {
  const text = message.trim();
  if (!text) return null;

  // Intent layer first.
  for (const { pattern, reply } of INTENT_PATTERNS) {
    if (pattern.test(text.toLowerCase())) return reply;
  }

  // Retrieval layer.
  const questionTokens = tokens(text);
  if (questionTokens.length === 0) return null;

  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const entry of knowledge) {
    const score = scoreEntry(entry, text, questionTokens);
    if (!best || score > best.score) best = { entry, score };
  }

  if (!best || best.score < 2.5) return null;

  const { entry } = best;
  const links = entry.links?.map((l) => ({ href: l.href, label: l.label }));
  return {
    reply: entry.answer,
    links,
    sources: [{ id: entry.id, topic: entry.topic }],
  };
}

export function fallbackReply(): ChatReply {
  return {
    reply: `${fallbackMessage}\n\n${fallbackTopics
      .map((t, i) => `${i + 1}. ${t.label}`)
      .join('\n')}\n\nOr contact support@assistedly.ai and a human will help.`,
    links: fallbackTopics
      .map((t) => getEntryById(t.entryId))
      .filter((e): e is KnowledgeEntry => !!e)
      .flatMap((e) => e.links ?? []),
    sources: fallbackTopics.map((t) => ({ id: t.entryId, topic: t.label })),
  };
}

/** Send a message and get the assistant reply. */
export async function sendChatMessage(message: string, sessionId: string): Promise<ChatReply> {
  if (API_URL) {
    return sendToWorker(message, sessionId);
  }
  // Demo mode with a natural pause so the typing indicator reads well.
  await new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 550));
  return demoAnswer(message) ?? fallbackReply();
}