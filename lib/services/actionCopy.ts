import { Category, VoiceLanguage } from '@/types';

const ACTION_VERB: Record<Category, { en: string; ne: string }> = {
  medicine: { en: 'Take', ne: 'औषधि खानुहोस्' },
  buy: { en: 'Buy', ne: 'किन्नुहोस्' },
  doctor: { en: 'See', ne: 'डाक्टर भेट्नुहोस्' },
  call: { en: 'Call', ne: 'कल गर्नुहोस्' },
  general: { en: 'Reminder', ne: 'याद' },
  document: { en: 'Do', ne: 'गर्नुहोस्' },
  repeat: { en: 'Repeat', ne: 'दोहोर्याउनुहोस्' },
};

export function normalizeReminderTitle(raw: string): string {
  return raw
    .replace(
      /^(need to|i need to|i have to|i gotta|gotta|got to|please|pls)\s+/i,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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
  _notes: string | null,
  tier: 'nudge' | 'alert' | 'insist1' | 'insist2',
): string {
  if (tier === 'nudge') return 'Coming up soon';
  if (tier === 'insist1' || tier === 'insist2') {
    if (category === 'medicine') return 'Please take it — then tap Done';
    if (category === 'doctor') return 'Still waiting — see the doctor';
    if (category === 'buy') return 'Still need to buy this';
    if (category === 'call') return 'Still waiting — Call · Done · Snooze';
    return 'Still open — tap Done when finished';
  }
  if (category === 'medicine') return 'Take your medicine, then tap Done';
  if (category === 'buy') return 'Buy this, then tap Done';
  if (category === 'doctor') return 'See the doctor, then tap Done';
  if (category === 'call') return 'Action: Call now · Done · Snooze 30m';
  return 'Tap Done when finished';
}

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
    if (category === 'medicine') {
      return ne ? `अझै औषधि बाँकी: ${neat}` : `Please take your medicine: ${neat}`;
    }
    return ne ? `अझै बाँकी: ${neat}` : `Still open: ${neat}`;
  }

  if (category === 'medicine') {
    return ne ? `औषधि खाने समय: ${neat}` : `Time for your medicine: ${neat}`;
  }
  if (category === 'buy') {
    return ne ? `किन्नुहोस्: ${neat}` : `Time to buy: ${neat}`;
  }
  if (category === 'doctor') {
    return ne ? `डाक्टर भेट्ने समय: ${neat}` : `Doctor visit: ${neat}`;
  }
  if (category === 'call') {
    return ne ? `${neat} — अहिले कल गर्नुहोस्` : `Time to call — ${neat}`;
  }
  return ne
    ? `${ACTION_VERB.general.ne}: ${neat}`
    : `Reminder: ${neat}`;
}
