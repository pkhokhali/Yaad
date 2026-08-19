import { Alert, Platform } from 'react-native';

import { openOfflineSpeechSettings } from 'yaad-native';

export const OFFLINE_SPEECH_STEPS_EN = [
  '1. Tap “Open Google speech settings” below.',
  '2. Open Offline speech recognition (or On-device speech).',
  '3. Download Nepali if it appears in the list.',
  '4. If Nepali is missing, your phone does not offer it offline — use Yaad voice on Wi‑Fi instead.',
  '5. Return to Yaad and try again.',
];

export const OFFLINE_SPEECH_STEPS_NE = [
  '१. तल “Google speech settings खोल्नुहोस्” थिच्नुहोस्।',
  '२. Offline speech recognition (वा On-device speech) खोल्नुहोस्।',
  '३. सूचीमा Nepali भए डाउनलोड गर्नुहोस्।',
  '४. Nepali नभए, यो फोनमा अफलाइन उपलब्ध छैन — Wi‑Fi मा Yaad voice प्रयोग गर्नुहोस्।',
  '५. Yaad मा फर्केर पुन: प्रयास गर्नुहोस्।',
];

export function offlineSpeechStepsText(uiLanguage: 'en' | 'ne'): string {
  const steps = uiLanguage === 'ne' ? OFFLINE_SPEECH_STEPS_NE : OFFLINE_SPEECH_STEPS_EN;
  return steps.join('\n');
}

export function isLanguageNotSupportedError(message: string): boolean {
  return /error:\s*12|ERROR_LANGUAGE_NOT_SUPPORTED|language not supported/i.test(
    message,
  );
}

export function formatOfflineDownloadError(
  message: string,
  uiLanguage: 'en' | 'ne',
): string {
  if (isLanguageNotSupportedError(message)) {
    return uiLanguage === 'ne'
      ? 'यो फोनमा नेपाली अफलाइन उपलब्ध छैन। Wi‑Fi मा voice प्रयोग गर्नुहोस्, वा Google speech settings मा हातले जाँच गर्नुहोस्।'
      : 'Nepali offline is not available on this phone. Use Yaad voice on Wi‑Fi, or check Google speech settings manually.';
  }
  return message;
}

export function showOfflineSpeechHelp(
  uiLanguage: 'en' | 'ne',
  detail?: string,
): void {
  const steps = offlineSpeechStepsText(uiLanguage);
  const body = detail ? `${detail}\n\n${steps}` : steps;
  const buttons: { text: string; onPress?: () => void; style?: 'cancel' }[] = [];

  if (Platform.OS === 'android') {
    buttons.push({
      text:
        uiLanguage === 'ne'
          ? 'Google speech settings खोल्नुहोस्'
          : 'Open Google speech settings',
      onPress: () => {
        openOfflineSpeechSettings().catch(() => undefined);
      },
    });
  }

  buttons.push({
    text: uiLanguage === 'ne' ? 'बुझें' : 'Got it',
    style: 'cancel',
  });

  Alert.alert(
    uiLanguage === 'ne' ? 'नेपाली अफलाइन आवाज' : 'Nepali offline voice',
    body,
    buttons,
  );
}
