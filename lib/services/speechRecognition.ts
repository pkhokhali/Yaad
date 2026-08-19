import {
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { Platform } from 'react-native';

import { copyForLanguage } from '@/lib/i18n/copy';
import {
  getVoiceLanguageOption,
  languageHasOnDeviceSupport,
  resolveSpeechLocale,
  VoiceLanguageOption,
} from '@/lib/services/voiceLanguages';
import { resolveVoiceNetworkAccess } from '@/lib/services/voiceNetwork';
import {
  ROMANIZED_NE_STT_CONTEXT,
  SHARED_STT_CONTEXT,
} from '@/lib/voice/sttContext';
import { useSettingsStore } from '@/store/useSettingsStore';
import { VoiceLanguage } from '@/types';

export type SpeechCaptureMode = 'tap' | 'handsFree';

/** Stop and process after this much silence (Android intent + JS timer). */
export const SPEECH_PAUSE_MS = 3000;

const SHARED_CONTEXT = SHARED_STT_CONTEXT;

/** Romanized Nepali phrases Google STT often emits instead of Devanagari. */
const ROMANIZED_NE = ROMANIZED_NE_STT_CONTEXT;

export class TranscriptAccumulator {
  private finals: string[] = [];
  private interim = '';

  reset(): void {
    this.finals = [];
    this.interim = '';
  }

  update(event: ExpoSpeechRecognitionResultEvent): string {
    const chunk = pickBestTranscript(event);
    if (!chunk) return this.text;

    if (event.isFinal) {
      this.finals.push(chunk);
      this.interim = '';
    } else {
      this.interim = chunk;
    }
    return this.text;
  }

  get text(): string {
    return [...this.finals, this.interim].join(' ').replace(/\s+/g, ' ').trim();
  }
}

export function pickBestTranscript(
  event: ExpoSpeechRecognitionResultEvent,
): string {
  const results = event.results ?? [];
  if (results.length === 0) return '';

  let best = results[0];
  for (const candidate of results) {
    if (
      candidate.confidence > 0 &&
      (best.confidence < 0 || candidate.confidence > best.confidence)
    ) {
      best = candidate;
    }
  }
  return best.transcript?.trim() ?? '';
}

export function contextualStringsFor(
  option: VoiceLanguageOption,
): string[] {
  const extra =
    option.value === 'ne' || option.value === 'new' ? ROMANIZED_NE : [];
  return [...new Set([...option.contextualStrings, ...SHARED_CONTEXT, ...extra])];
}

export function buildSpeechOptions(
  lang: VoiceLanguage,
  locale: string,
  _mode: SpeechCaptureMode,
  preferOffline: boolean,
  servicePackage?: string | null,
): ExpoSpeechRecognitionOptions {
  const option = getVoiceLanguageOption(lang);
  const options: ExpoSpeechRecognitionOptions = {
    lang: locale,
    interimResults: true,
    continuous: true,
    maxAlternatives: 3,
    requiresOnDeviceRecognition: preferOffline,
    addsPunctuation: true,
    contextualStrings: contextualStringsFor(option),
    iosTaskHint: 'dictation',
    iosVoiceProcessingEnabled: true,
  };

  if (Platform.OS === 'android') {
    if (preferOffline && servicePackage) {
      options.androidRecognitionServicePackage = servicePackage;
    }
    options.androidIntent = 'android.speech.action.VOICE_SEARCH_HANDS_FREE';
    options.androidIntentOptions = {
      EXTRA_LANGUAGE_MODEL: 'free_form',
      EXTRA_PREFER_OFFLINE: preferOffline,
      EXTRA_ENABLE_BIASING_DEVICE_CONTEXT: true,
      EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1200,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: SPEECH_PAUSE_MS,
    };
  }

  return options;
}

export type StartSpeechSessionResult = {
  locale: string;
  usedFallback: boolean;
  hint: string | null;
};

export async function startSpeechSession(
  lang: VoiceLanguage,
  _mode: SpeechCaptureMode = 'tap',
): Promise<StartSpeechSessionResult> {
  const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Microphone permission needed');
  }

  const settings = useSettingsStore.getState();
  const uiCopy = copyForLanguage(settings.uiLanguage ?? 'en');
  const option = getVoiceLanguageOption(lang);
  const onDevice = await languageHasOnDeviceSupport(lang);
  const network = await resolveVoiceNetworkAccess(
    settings.allowVoiceOnMobileData ?? false,
  );

  if (lang === 'new' && !onDevice && !network.allowNetwork) {
    throw new Error(uiCopy.newariUnavailable);
  }

  if (!onDevice && !network.allowNetwork && lang !== 'en') {
    const englishOnDevice = await languageHasOnDeviceSupport('en');
    if (!englishOnDevice) {
      throw new Error(
        network.onCellular
          ? 'Nepali voice needs Wi‑Fi, or turn on mobile data for voice in Settings'
          : uiCopy.voiceUnavailable,
      );
    }
  }

  const resolved = await resolveSpeechLocale(lang, {
    allowNetwork: network.allowNetwork,
    preferOffline: network.preferOffline || !network.allowNetwork,
  });

  const preferOffline = resolved.usedOfflineModel || !network.allowNetwork;

  try {
    ExpoSpeechRecognitionModule.start(
      buildSpeechOptions(
        lang,
        resolved.locale,
        _mode,
        preferOffline,
        resolved.servicePackage,
      ),
    );
  } catch {
    if (preferOffline && network.allowNetwork) {
      ExpoSpeechRecognitionModule.start(
        buildSpeechOptions(lang, resolved.locale, _mode, false, null),
      );
    } else if (!preferOffline) {
      throw new Error(uiCopy.voiceUnavailable);
    } else {
      throw new Error(
        network.onCellular
          ? 'Nepali voice needs Wi‑Fi, or turn on mobile data for voice in Settings'
          : uiCopy.voiceUnavailable,
      );
    }
  }

  let hint: string | null = option.hint;
  if (resolved.usedOfflineModel && (lang === 'ne' || lang === 'new')) {
    hint = 'Nepali offline model — no internet needed';
  } else if (resolved.romanizedFallback) {
    hint =
      lang === 'ne' || lang === 'new'
        ? 'Romanized Nepali — speak as you type in English letters'
        : option.hint;
  } else if (network.onCellular && !network.allowNetwork && onDevice) {
    hint = 'Offline voice — Wi‑Fi or Settings for Google STT';
  }

  return {
    locale: resolved.locale,
    usedFallback: resolved.usedFallback,
    hint,
  };
}

export function stopSpeechSession(): void {
  ExpoSpeechRecognitionModule.stop();
}

export function abortSpeechSession(): void {
  ExpoSpeechRecognitionModule.abort();
}

/** Normalize common STT quirks before parsing reminders. */
export function normalizeSpeechTranscript(
  raw: string,
  lang: VoiceLanguage,
): string {
  let text = raw.replace(/\s+/g, ' ').trim();

  const replacements: Array<[RegExp, string]> = [
    [/\b2\s*min\b/gi, '2 minutes'],
    [/\b5\s*min\b/gi, '5 minutes'],
    [/\bmins\b/gi, 'minutes'],
    [/\bmin\b/gi, 'minute'],
    [/\bpachi\b/gi, 'pachhi'],
    [/\bphone call\b/gi, 'call'],
    [/\bneed to\b/gi, 'remind me to'],
  ];

  if (lang === 'ne' || lang === 'new') {
    replacements.push(
      [/\bbholi\b/gi, 'bholi'],
      [/\baaja\b/gi, 'aaja'],
      [/\bsamjhau\b/gi, 'samjhau'],
      [/\bminute pachhi\b/gi, 'minute pachhi'],
      [/\bmin pachhi\b/gi, 'min pachhi'],
      [/\bmalai samjhau\b/gi, 'malai samjhau'],
      [/\byaad gara\b/gi, 'yaad gara'],
    );
  }

  for (const [pattern, value] of replacements) {
    text = text.replace(pattern, value);
  }

  return text;
}

export function speechErrorMessage(code?: string): string {
  switch (code) {
    case 'no-speech':
    case 'speech-timeout':
      return 'No speech detected — try again, a bit closer to the mic';
    case 'network':
      return 'Voice needs internet for this language on your phone';
    case 'language-not-supported':
      return "This language isn't available — try English in Settings";
    case 'not-allowed':
      return 'Microphone permission needed';
    case 'busy':
      return 'Voice is busy — wait a moment and try again';
    default:
      return "Couldn't hear that — try again";
  }
}

export async function promptOfflineLanguageDownload(
  lang: VoiceLanguage,
): Promise<{ ok: boolean; message: string }> {
  if (Platform.OS !== 'android') {
    return { ok: false, message: 'Offline models are Android-only.' };
  }
  if (lang === 'ne' || lang === 'new') {
    const { downloadNepaliOfflineModel } = await import(
      '@/lib/services/offlineVoiceModel'
    );
    const result = await downloadNepaliOfflineModel();
    return { ok: result.ok, message: result.message };
  }
  const { locale } = await resolveSpeechLocale(lang, {
    allowNetwork: true,
    preferOffline: true,
  });
  try {
    const result = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
      locale,
    });
    return {
      ok: true,
      message: result.message || 'Offline voice download started.',
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Download failed.',
    };
  }
}
