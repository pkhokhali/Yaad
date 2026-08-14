import { Platform } from 'react-native';

import { synthesizeAlertSound } from 'yaad-native';

import { VoiceLanguage } from '@/types';

export function speechLocaleTag(language: VoiceLanguage): string {
  if (language === 'en') return 'en-US';
  return 'ne-NP';
}

/** Build a per-reminder Android channel whose sound is locally synthesized speech. */
export async function ensureSpokenNotificationChannel(
  channelKey: string,
  spoken: string,
  language: VoiceLanguage,
): Promise<string | null> {
  if (Platform.OS !== 'android' || !spoken.trim()) return null;

  try {
    const result = await synthesizeAlertSound(
      spoken,
      speechLocaleTag(language),
      channelKey,
    );
    return result?.channelId ?? null;
  } catch {
    return null;
  }
}
