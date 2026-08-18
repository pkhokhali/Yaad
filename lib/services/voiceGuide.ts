import { VoiceLanguage } from '@/types';

export type VoiceAddKind = 'todo' | 'reminder' | 'expense';

type PromptSet = {
  pick: string;
  retry: string;
  subtitle: string;
  kindSelected: Record<VoiceAddKind, string>;
  capture: Record<VoiceAddKind, string>;
  labels: Record<VoiceAddKind, string>;
};

const PROMPTS: Record<VoiceLanguage, PromptSet> = {
  en: {
    pick: 'What would you like to add? Say To-do, Reminder, or Expense.',
    retry: 'Say To-do, Reminder, or Expense.',
    subtitle: 'Pick one, then tell me what to add.',
    kindSelected: {
      todo: 'To-do — go ahead.',
      reminder: 'Reminder — go ahead.',
      expense: 'Expense — go ahead.',
    },
    capture: {
      todo: 'What needs doing?',
      reminder: 'What should I remind you about? Say when, if you know.',
      expense: 'How much was it, and what for?',
    },
    labels: {
      todo: 'To-do',
      reminder: 'Reminder',
      expense: 'Expense',
    },
  },
  ne: {
    pick: 'के थप्ने? टु-डु, सम्झना, वा खर्च भन्नुहोस्।',
    retry: 'टु-डु, सम्झना, वा खर्च फेरि भन्नुहोस्।',
    subtitle: 'एउटा छान्नुहोस्, अनि के थप्ने भन्नुहोस्।',
    kindSelected: {
      todo: 'टु-डु — अब भन्नुहोस्।',
      reminder: 'सम्झना — अब भन्नुहोस्।',
      expense: 'खर्च — अब भन्नुहोस्।',
    },
    capture: {
      todo: 'के गर्नुपर्छ?',
      reminder: 'के सम्झाउने? समय भए भन्नुहोस्।',
      expense: 'कति रु, र के लागि?',
    },
    labels: {
      todo: 'टु-डु',
      reminder: 'सम्झना',
      expense: 'खर्च',
    },
  },
  new: {
    pick: 'का थ्वय्? टु-डु, याद, वा खर्च च्वनाः।',
    retry: 'टु-डु, याद, वा खर्च फेरि च्वनाः।',
    subtitle: 'एक छान, अनि के थप्ने च्वनाः।',
    kindSelected: {
      todo: 'टु-डु — अब च्वनाः।',
      reminder: 'याद — अब च्वनाः।',
      expense: 'खर्च — अब च्वनाः।',
    },
    capture: {
      todo: 'का ग्वः?',
      reminder: 'का याद द्यः? समय भए च्वनाः।',
      expense: 'कति रु, र का लागि?',
    },
    labels: {
      todo: 'टु-डु',
      reminder: 'याद',
      expense: 'खर्च',
    },
  },
};

function promptsFor(language: VoiceLanguage): PromptSet {
  return PROMPTS[language] ?? PROMPTS.en;
}

export function promptPickType(language: VoiceLanguage): string {
  return promptsFor(language).pick;
}

export function promptRetryPickType(language: VoiceLanguage): string {
  return promptsFor(language).retry;
}

export function guidedFlowHint(language: VoiceLanguage): string {
  return promptsFor(language).subtitle;
}

export function promptCapture(kind: VoiceAddKind, language: VoiceLanguage): string {
  return promptsFor(language).capture[kind];
}

export function kindSelectedMessage(
  kind: VoiceAddKind,
  language: VoiceLanguage,
): string {
  return promptsFor(language).kindSelected[kind];
}

export function kindLabel(kind: VoiceAddKind, language: VoiceLanguage = 'en'): string {
  return promptsFor(language).labels[kind];
}

export function parseVoiceAddKind(raw: string): VoiceAddKind | null {
  const text = raw.toLowerCase().trim();
  if (!text) return null;

  if (
    /\b(to-?\s*do|todo|टु|टु-डु)\b/u.test(text) ||
    text === 'to do' ||
    /\b(काम|gwah|gwa)\b/u.test(text)
  ) {
    return 'todo';
  }

  if (
    /\b(reminder|reminders|medicine|call|doctor|appointment|याद|सम्झ|samjhau|yaad|सम्झना)\b/u.test(
      text,
    )
  ) {
    return 'reminder';
  }

  if (
    /\b(expense|expenses|lend|borrow|money|spent|खर्च|पैस|रु)\b/u.test(text) ||
    /\brs\b/u.test(text)
  ) {
    return 'expense';
  }

  return null;
}

export function parseExpenseVoice(
  raw: string,
): { title: string; amount: number; ledger: 'office' | 'personal' } | null {
  const text = raw.trim();
  if (!text) return null;

  const amountMatch =
    text.match(/(?:rs\.?\s*|रू\.?\s*|rupees?\s*)(\d+(?:\.\d+)?)/iu) ??
    text.match(/(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees?|रू)/iu) ??
    text.match(/\b(\d+(?:\.\d+)?)\b/);

  if (!amountMatch) return null;

  const amount = Number(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let title = text
    .replace(amountMatch[0], '')
    .replace(/\b(for|on|office|personal|expense|lend|add|spent)\b/giu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!title) title = 'Expense';

  const ledger = /\boffice\b/iu.test(text) ? 'office' : 'personal';

  return { title, amount, ledger };
}
