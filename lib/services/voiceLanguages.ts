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
 * Do not fall back to Hindi for Nepali — it misrecognizes Nepali speech badly.
 */
export const VOICE_LANGUAGE_OPTIONS: VoiceLanguageOption[] = [
  {
    value: 'en',
    label: 'English',
    nativeLabel: 'English',
    short: 'EN',
    hint: 'Speak in English',
    locales: ['en-IN', 'en-US', 'en-GB', 'en'],
    contextualStrings: [
      'remind me',
      'remind me to',
      'remember to',
      'tomorrow',
      'tonight',
      'this evening',
      'after 2 minutes',
      'in 5 minutes',
      'need to call',
      'call mom',
      'call',
      'minutes',
    ],
  },
  {
    value: 'ne',
    label: 'Nepali',
    nativeLabel: 'नेपाली',
    short: 'ने',
    hint: 'नेपालीमा बोल्नुहोस्',
    locales: ['ne-NP', 'ne'],
    contextualStrings: [
      'मलाई सम्झाउ',
      'सम्झाउ',
      'याद गर',
      'भोलि',
      'आज',
      'पर्सि',
      'बजे',
      'बिहान',
      'बेलुका',
      'मिनेट',
      'मिनेटमा',
      'घण्टा',
      'पछि',
      'फोन',
      'कल गर्नु',
      'malai samjhau',
      'bholi',
      'aaja',
      'minute pachhi',
      'call garnu',
    ],
  },
  {
    value: 'new',
    label: 'Newari',
    nativeLabel: 'नेपाल भाषा',
    short: 'नेवा',
    hint: 'नेपाल भाषां ल्हाये',
    locales: ['new-NP', 'new', 'ne-NP', 'ne'],
    contextualStrings: [
      'थौं',
      'कन्हय्',
      'पिन्हय्',
      'भलनी',
      'चाः',
      'लुमंके',
      'बजे',
      'भोलि',
      'सम्झाउ',
      'malai samjhau',
      'bholi',
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

export async function languageHasOnDeviceSupport(
  lang: VoiceLanguage,
): Promise<boolean> {
  const option = getVoiceLanguageOption(lang);
  const { installed, supported } = await getRecognizerLocales();
  const pool = installed.length > 0 ? installed : supported;
  const wanted =
    lang === 'new'
      ? option.locales.filter((code) => localePrefix(code) === 'new')
      : option.locales;
  return wanted.some((code) => Boolean(findSupported(pool, code)));
}

export async function listOnDeviceVoiceLanguages(): Promise<
  VoiceLanguageOption[]
> {
  const available: VoiceLanguageOption[] = [];
  for (const option of VOICE_LANGUAGE_OPTIONS) {
    if (await languageHasOnDeviceSupport(option.value)) {
      available.push(option);
    }
  }
  return available;
}

export function nextVoiceLanguageFrom(
  lang: VoiceLanguage,
  options: VoiceLanguageOption[],
): VoiceLanguage {
  if (options.length === 0) return 'en';
  const i = options.findIndex((o) => o.value === lang);
  return options[(i + 1) % options.length].value;
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

async function getRecognizerLocales(): Promise<{
  supported: string[];
  installed: string[];
}> {
  try {
    const result = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    return {
      supported: result.locales ?? [],
      installed: result.installedLocales ?? [],
    };
  } catch {
    return { supported: [], installed: [] };
  }
}

/**
 * Pick a locale the recognizer can use. Network Google STT often accepts ne-NP
 * even when it is not listed as installed offline.
 */
export async function resolveSpeechLocale(
  lang: VoiceLanguage,
): Promise<ResolvedSpeechLocale> {
  const option = getVoiceLanguageOption(lang);
  const primary = option.locales[0];
  const { supported, installed } = await getRecognizerLocales();

  const pickFromLists = (codes: string[]) => {
    for (const code of codes) {
      const installedHit = findSupported(installed, code);
      if (installedHit) {
        return {
          locale: installedHit,
          usedFallback: localePrefix(installedHit) !== localePrefix(primary),
        };
      }
      const supportedHit = findSupported(supported, code);
      if (supportedHit) {
        return {
          locale: supportedHit,
          usedFallback: localePrefix(supportedHit) !== localePrefix(primary),
        };
      }
    }
    return null;
  };

  if (lang === 'new') {
    const native = pickFromLists(
      option.locales.filter((code) => localePrefix(code) === 'new'),
    );
    if (native) return native;
    return { locale: 'new-NP', usedFallback: true };
  }

  const hit = pickFromLists(option.locales);
  if (hit) return hit;

  // Request primary — Google network STT often still works (especially ne-NP).
  return { locale: primary, usedFallback: false };
}
