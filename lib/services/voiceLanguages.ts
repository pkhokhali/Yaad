import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { VoiceLanguage } from '@/types';

export type VoiceLanguageOption = {
  value: VoiceLanguage;
  label: string;
  nativeLabel: string;
  short: string;
  hint: string;
  locales: string[];
  contextualStrings: string[];
};

/**
 * Preferred BCP-47 tags, first match wins.
 * Newari has no OS speech model on Google/Apple, so it falls through to Nepali.
 */
export const VOICE_LANGUAGE_OPTIONS: VoiceLanguageOption[] = [
  {
    value: 'en',
    label: 'English',
    nativeLabel: 'English',
    short: 'EN',
    hint: 'Listen in English',
    locales: ['en-US', 'en-IN', 'en-GB'],
    contextualStrings: [
      'remind me',
      'tomorrow',
      'tonight',
      'this evening',
      'call',
    ],
  },
  {
    value: 'ne',
    label: 'Nepali',
    nativeLabel: 'नेपाली',
    short: 'ने',
    hint: 'नेपालीमा बोल्नुहोस्',
    locales: ['ne-NP', 'ne', 'hi-IN'],
    contextualStrings: [
      'भोलि',
      'आज',
      'पर्सि',
      'बजे',
      'बिहान',
      'बेलुका',
      'याद',
      'सम्झाउ',
      'कल गर्नु',
    ],
  },
  {
    value: 'new',
    label: 'Newari',
    nativeLabel: 'नेपाल भाषा',
    short: 'नेवा',
    hint: 'नेपाल भाषां ल्हाये',
    locales: ['new-NP', 'new', 'ne-NP', 'ne', 'hi-IN'],
    contextualStrings: [
      'थौं',
      'कन्हय्',
      'पिन्हय्',
      'भलनी',
      'चाः',
      'लुमंके',
      'बजे',
      'भोलि',
    ],
  },
];

export function getVoiceLanguageOption(
  lang: VoiceLanguage,
): VoiceLanguageOption {
  return (
    VOICE_LANGUAGE_OPTIONS.find((o) => o.value === lang) ??
    VOICE_LANGUAGE_OPTIONS[0]
  );
}

export function nextVoiceLanguage(lang: VoiceLanguage): VoiceLanguage {
  const i = VOICE_LANGUAGE_OPTIONS.findIndex((o) => o.value === lang);
  return VOICE_LANGUAGE_OPTIONS[(i + 1) % VOICE_LANGUAGE_OPTIONS.length].value;
}

function normalizeLocale(code: string): string {
  return code.replace(/_/g, '-').toLowerCase();
}

function localePrefix(code: string): string {
  return normalizeLocale(code).split('-')[0];
}

function findSupported(
  supported: string[],
  wanted: string,
): string | undefined {
  const n = normalizeLocale(wanted);
  const prefix = localePrefix(wanted);
  return supported.find((item) => {
    const s = normalizeLocale(item);
    return s === n || s.startsWith(`${n}-`) || s === prefix || s.startsWith(`${prefix}-`);
  });
}

export type ResolvedSpeechLocale = {
  locale: string;
  usedFallback: boolean;
};

/**
 * Pick a locale the recognizer can actually use.
 * Network STT (Android Google) often understands ne-NP even when it is not
 * in the on-device list, so Nepali still requests ne-NP in that case.
 */
export async function resolveSpeechLocale(
  lang: VoiceLanguage,
): Promise<ResolvedSpeechLocale> {
  const option = getVoiceLanguageOption(lang);
  const primary = option.locales[0];

  let supported: string[] = [];
  try {
    const result = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    supported = result.locales ?? [];
  } catch {
    supported = [];
  }

  if (lang === 'new') {
    const nativeNewari = option.locales
      .filter((code) => localePrefix(code) === 'new')
      .map((code) => findSupported(supported, code))
      .find(Boolean);
    if (nativeNewari) {
      return { locale: nativeNewari, usedFallback: false };
    }
    const nepali =
      findSupported(supported, 'ne-NP') ??
      findSupported(supported, 'ne') ??
      findSupported(supported, 'hi-IN') ??
      'ne-NP';
    return { locale: nepali, usedFallback: true };
  }

  if (supported.length > 0) {
    for (const code of option.locales) {
      const hit = findSupported(supported, code);
      if (hit) {
        return {
          locale: hit,
          usedFallback: localePrefix(hit) !== localePrefix(primary),
        };
      }
    }
  }

  return { locale: primary, usedFallback: false };
}
