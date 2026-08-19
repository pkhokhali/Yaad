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
      todo: 'What needs doing? Lists work: "buy eggs, milk, and bread".',
      reminder:
        'What & when? e.g. "call mom tomorrow at 6 in the evening".',
      expense: 'Amount first: "spent 200 rupees today" or "500 rs lunch".',
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
      todo: 'के गर्नुपर्छ? सूची: "अण्डा, दूध, पाउरोटी किन्नु".',
      reminder: 'के र कहिले? जस्तै "आमा लाई भोलि बेलुका ६ बजे फोन।"',
      expense: 'पहिले रकम: "२०० रु खर्च" वा "५०० रु खाना"।',
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
      todo: 'का ग्वः? सूची: "अण्डा, दूध, पाउरोटी किने"।',
      reminder: 'का याद द्यः? जस्तै "आमा लाई भोलि बेलुका ६ बजे फोन"।',
      expense: 'पहिले रकम: "२०० रु खर्च" वा "५०० रु खाना"।',
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

const EXPENSE_TITLE_NOISE =
  /\b(i|me|my|the|a|an|spent|spend|paid|pay|for|on|of|about|around|approximately|roughly|rs\.?|rupees?|रू|rp|expense|expenses|lend|borrow|add|was|were|is|are|have|has|some|money)\b/giu;

function titleCaseWords(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferExpenseTitle(source: string): string {
  if (/\btoday\b/iu.test(source)) return 'Today';
  if (/\byesterday\b/iu.test(source)) return 'Yesterday';
  if (/\btomorrow\b/iu.test(source)) return 'Tomorrow';

  const category = source.match(
    /\b(lunch|dinner|breakfast|food|travel|medicine|petrol|fuel|groceries|shopping|rent|bus|taxi|tea|coffee)\b/iu,
  );
  if (category) return titleCaseWords(category[1]);

  return 'Expense';
}

export function parseExpenseVoice(
  raw: string,
): { title: string; amount: number; ledger: 'office' | 'personal' } | null {
  const text = raw.trim();
  if (!text) return null;

  const amountMatch =
    text.match(
      /(?:spent|spend|paid|pay|cost|costs|give|gave|lent|borrowed)\s*(?:rs\.?\s*|rupees?\s*|रू\.?\s*)?(\d+(?:\.\d+)?)/iu,
    ) ??
    text.match(/(?:rs\.?\s*|रू\.?\s*|rupees?\s*)(\d+(?:\.\d+)?)/iu) ??
    text.match(/(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees?|रू)/iu) ??
    text.match(/\b(\d+(?:\.\d+)?)\b/);

  if (!amountMatch) return null;

  const amount = Number(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let title = text
    .replace(amountMatch[0], ' ')
    .replace(EXPENSE_TITLE_NOISE, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!title || title.length < 2) {
    title = inferExpenseTitle(text);
  } else {
    title = titleCaseWords(title);
  }

  const ledger = /\boffice\b/iu.test(text) ? 'office' : 'personal';

  return { title, amount, ledger };
}
