import { Category, VoiceLanguage } from '@/types';

const ACTION_VERB: Record<Category, { en: string; ne: string }> = {
  call: { en: 'Call', ne: 'कल गर्नुहोस्' },
  document: { en: 'Do', ne: 'गर्नुहोस्' },
  repeat: { en: 'Repeat', ne: 'दोहोर्याउनुहोस्' },
  general: { en: 'Reminder', ne: 'याद' },
};

/** Strip leading filler so "Need to call mom" → "call mom". */
export function normalizeReminderTitle(raw: string): string {
  return raw
    .replace(
      /^(need to|i need to|i have to|i gotta|gotta|got to|please|pls)\s+/i,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Prefer a short action title: "Call mom" not "Need to Call mom after 2 min". */
export function formatActionTitle(
  title: string,
  category: Category,
): string {
  let t = normalizeReminderTitle(title).trim();
  if (!t) t = 'Reminder';

  if (category === 'call') {
    if (!/^\s*call\b/i.test(t) && !/^\s*कल\b/u.test(t)) {
      t = `Call ${t}`;
    }
  }

  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function formatNotificationBody(
  category: Category,
  notes: string | null,
  tier: 'nudge' | 'alert' | 'insist1' | 'insist2',
): string {
  if (tier === 'nudge') return 'Coming up soon';
  if (tier === 'insist1' || tier === 'insist2') {
    return category === 'call'
      ? 'Still waiting — Call · Done · Snooze'
      : 'Still open — Done · Snooze · Voice';
  }
  if (category === 'call') {
    return 'Action: Call now · Done · Snooze 30m';
  }
  if (category === 'document') {
    return notes?.trim() || 'Action: Finish this · Done · Snooze';
  }
  return notes?.trim() || 'Done · Snooze · Voice';
}

/** What TTS should say — action first, then the subject. */
export function formatSpokenAlert(
  title: string,
  category: Category,
  language: VoiceLanguage,
  tier: 'nudge' | 'alert' | 'insist1' | 'insist2' = 'alert',
): string {
  const neat = formatActionTitle(title, category);
  const ne = language === 'ne' || language === 'new';

  if (tier === 'nudge') {
    return ne ? `चाँडै: ${neat}` : `Coming up: ${neat}`;
  }
  if (tier === 'insist1' || tier === 'insist2') {
    return ne ? `अझै बाँकी: ${neat}` : `Still open: ${neat}`;
  }

  if (category === 'call') {
    return ne ? `${neat} — अहिले कल गर्नुहोस्` : `Time to call — ${neat}`;
  }
  if (category === 'document') {
    return ne ? `कागजात: ${neat}` : `Document due — ${neat}`;
  }
  if (category === 'repeat') {
    return ne ? `दोहोरिने: ${neat}` : `Recurring — ${neat}`;
  }
  return ne
    ? `${ACTION_VERB.general.ne}: ${neat}`
    : `Reminder: ${neat}`;
}
