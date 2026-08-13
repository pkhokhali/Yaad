import * as Speech from 'expo-speech';

import { VoiceLanguage } from '@/types';

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
