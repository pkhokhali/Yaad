import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Platform } from 'react-native';

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
  const { installed } = await getRecognizerLocales();
  const wanted =
    lang === 'new'
      ? option.locales.filter((code) => localePrefix(code) === 'new')
      : option.locales;
  return wanted.some((code) => Boolean(findSupported(installed, code)));
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
  usedOfflineModel: boolean;
  romanizedFallback: boolean;
  servicePackage: string | null;
};

const GOOGLE_ONDEVICE_PACKAGES = [
  'com.google.android.as',
  'com.google.android.tts',
  'com.google.android.googlequicksearchbox',
];

async function getRecognizerLocales(): Promise<{
  supported: string[];
  installed: string[];
  installedPackage: string | null;
}> {
  const supported = new Set<string>();
  const installed = new Set<string>();
  let installedPackage: string | null = null;
  let fallbackPackage: string | null = null;

  const packages: Array<string | undefined> = [undefined];
  if (Platform.OS === 'android') {
    try {
      const services =
        ExpoSpeechRecognitionModule.getSpeechRecognitionServices?.() ?? [];
      for (const pkg of GOOGLE_ONDEVICE_PACKAGES) {
        if (services.includes(pkg)) packages.push(pkg);
      }
    } catch {
      // keep default only
    }
  }

  for (const pkg of packages) {
    try {
      const result = await ExpoSpeechRecognitionModule.getSupportedLocales({
        ...(pkg ? { androidRecognitionServicePackage: pkg } : {}),
      });
      for (const code of result.locales ?? []) supported.add(code);
      const packInstalled = result.installedLocales ?? [];
      if (packInstalled.length > 0 && !fallbackPackage) {
        fallbackPackage = pkg ?? null;
      }
      for (const code of packInstalled) {
        installed.add(code);
        if (
          !installedPackage &&
          (findSupported([code], 'ne-NP') || findSupported([code], 'ne'))
        ) {
          installedPackage = pkg ?? null;
        }
      }
    } catch {
      // service may not answer
    }
  }

  return {
    supported: [...supported],
    installed: [...installed],
    installedPackage: installedPackage ?? fallbackPackage,
  };
}

/**
 * Pick a locale the recognizer can use.
 * Nepali: on-device ne-NP when installed; else Google network STT (Devanagari
 * or romanized). If offline with no Nepali model, fall back to English STT
 * with romanized-Nepali biasing so it still works without internet.
 */
export async function resolveSpeechLocale(
  lang: VoiceLanguage,
  network?: { allowNetwork: boolean; preferOffline: boolean },
): Promise<ResolvedSpeechLocale> {
  const option = getVoiceLanguageOption(lang);
  const primary = option.locales[0];
  const allowNetwork = network?.allowNetwork ?? true;
  const preferOffline = network?.preferOffline ?? false;
  const { supported, installed, installedPackage } = await getRecognizerLocales();

  const pickFrom = (pool: string[], codes: string[]) => {
    for (const code of codes) {
      const hit = findSupported(pool, code);
      if (hit) return hit;
    }
    return null;
  };

  if (lang === 'new') {
    const nativeInstalled = pickFrom(
      installed,
      option.locales.filter((code) => localePrefix(code) === 'new'),
    );
    if (nativeInstalled) {
      return {
        locale: nativeInstalled,
        usedFallback: false,
        usedOfflineModel: true,
        romanizedFallback: false,
        servicePackage: installedPackage,
      };
    }
  }

  const installedHit = pickFrom(installed, option.locales);
  if (installedHit) {
    return {
      locale: installedHit,
      usedFallback: localePrefix(installedHit) !== localePrefix(primary),
      usedOfflineModel: true,
      romanizedFallback: false,
      servicePackage: installedPackage,
    };
  }

  if (allowNetwork && !preferOffline) {
    const supportedHit = pickFrom(supported, option.locales);
    return {
      locale: supportedHit ?? primary,
      usedFallback: false,
      usedOfflineModel: false,
      romanizedFallback: false,
      servicePackage: null,
    };
  }

  if (lang === 'ne' || lang === 'new') {
    const englishOffline =
      pickFrom(installed, ['en-IN', 'en-US', 'en']) ??
      pickFrom(supported, ['en-IN', 'en-US', 'en']);
    if (englishOffline) {
      return {
        locale: englishOffline,
        usedFallback: true,
        usedOfflineModel: Boolean(pickFrom(installed, ['en-IN', 'en-US', 'en'])),
        romanizedFallback: true,
        servicePackage: installedPackage,
      };
    }
  }

  return {
    locale: primary,
    usedFallback: false,
    usedOfflineModel: false,
    romanizedFallback: false,
    servicePackage: null,
  };
}
