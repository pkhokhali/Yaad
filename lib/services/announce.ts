import * as Speech from 'expo-speech';

import { formatSpokenAlert } from '@/lib/services/actionCopy';
import { Category, VoiceLanguage } from '@/types';

function speechLocale(language: VoiceLanguage): string {
  if (language === 'en') return 'en-US';
  return 'ne-NP';
}

export function stopAnnouncement(): void {
  Speech.stop();
}

/** Speak a reminder. OS has no Newari TTS, so Nepali is used for ने / नेवा. */
export function announceReminder(
  text: string,
  language: VoiceLanguage,
): void {
  const spoken = text.trim();
  if (!spoken) return;
  Speech.stop();
  Speech.speak(spoken, {
    language: speechLocale(language),
    pitch: 1,
    rate: 0.92,
  });
}

type AnnounceInput = {
  title?: string | null;
  body?: string | null;
  spoken?: string | null;
  category?: Category | string | null;
  tier?: 'nudge' | 'alert' | 'insist1' | 'insist2';
  language: VoiceLanguage;
};

/** Prefer action-aware copy over raw notification title+body. */
export function announceFromNotification(input: AnnounceInput): void {
  const category = (input.category as Category) || 'general';
  const tier = input.tier || 'alert';
  const spoken =
    input.spoken?.trim() ||
    (input.title
      ? formatSpokenAlert(input.title, category, input.language, tier)
      : input.title?.trim() || '');
  announceReminder(spoken, input.language);
}
