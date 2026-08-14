import {
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { Platform } from 'react-native';

import {
  getVoiceLanguageOption,
  resolveSpeechLocale,
  VoiceLanguageOption,
} from '@/lib/services/voiceLanguages';
import { VoiceLanguage } from '@/types';

export type SpeechCaptureMode = 'handsFree' | 'hold';

const SHARED_CONTEXT = [
  'remind me',
  'remind me to',
  'after',
  'in 2 minutes',
  'in 5 minutes',
  'tomorrow',
  'call',
  'call mom',
  'need to call',
  'याद',
  'सम्झाउ',
  'मलाई सम्झाउ',
  'भोलि',
  'आज',
  'बजे',
  'मिनेट',
  'मिनेटमा',
  'पछि',
  'phone call',
  'minutes',
  'minute',
  'hours',
];

/** Romanized Nepali phrases Google STT often emits instead of Devanagari. */
const ROMANIZED_NE = [
  'malai samjhau',
  'samjhau',
  'bholi',
  'aaja',
  'parsi',
  'baje',
  'minute ma',
  'minute pachi',
  'min pachi',
  'ghanta pachi',
  'call garnu',
  'phone garne',
  'yaad gar',
];

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
    option.value === 'ne' || option.value === 'new'
      ? ROMANIZED_NE
      : [];
  return [...new Set([...option.contextualStrings, ...SHARED_CONTEXT, ...extra])];
}

export function buildSpeechOptions(
  lang: VoiceLanguage,
  locale: string,
  mode: SpeechCaptureMode,
): ExpoSpeechRecognitionOptions {
  const option = getVoiceLanguageOption(lang);
  const handsFree = mode === 'handsFree';

  const options: ExpoSpeechRecognitionOptions = {
    lang: locale,
    interimResults: true,
    continuous: handsFree,
    maxAlternatives: 3,
    requiresOnDeviceRecognition: false,
    addsPunctuation: true,
    contextualStrings: contextualStringsFor(option),
    iosTaskHint: 'dictation',
    iosVoiceProcessingEnabled: true,
  };

  if (Platform.OS === 'android') {
    options.androidIntent = handsFree
      ? 'android.speech.action.VOICE_SEARCH_HANDS_FREE'
      : 'android.speech.action.RECOGNIZE_SPEECH';
    options.androidIntentOptions = {
      EXTRA_LANGUAGE_MODEL: 'free_form',
      EXTRA_PREFER_OFFLINE: false,
      EXTRA_ENABLE_BIASING_DEVICE_CONTEXT: true,
      EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 500,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 900,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: handsFree ? 2500 : 1600,
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
  mode: SpeechCaptureMode,
): Promise<StartSpeechSessionResult> {
  const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Microphone permission needed');
  }

  const option = getVoiceLanguageOption(lang);
  const resolved = await resolveSpeechLocale(lang);

  let hint: string | null = option.hint;
  if (resolved.usedFallback && lang === 'new') {
    hint = 'Newari isn\u2019t on this phone \u2014 listening in Nepali';
  } else if (resolved.usedFallback && lang === 'ne') {
    hint = `Listening as ${resolved.locale} (Nepali model)`;
  } else if (resolved.usedFallback && lang === 'en') {
    hint = `Listening in ${resolved.locale}`;
  }

  ExpoSpeechRecognitionModule.start(
    buildSpeechOptions(lang, resolved.locale, mode),
  );

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
      return 'No speech detected \u2014 try again, a bit closer to the mic';
    case 'network':
      return 'Voice needs internet for this language on your phone';
    case 'language-not-supported':
      return 'This language isn\u2019t available \u2014 try English in Settings';
    case 'not-allowed':
      return 'Microphone permission needed';
    case 'busy':
      return 'Voice is busy \u2014 wait a moment and try again';
    default:
      return 'Couldn\u2019t hear that \u2014 try again';
  }
}

export async function promptOfflineLanguageDownload(
  lang: VoiceLanguage,
): Promise<void> {
  if (Platform.OS !== 'android' || lang === 'en') return;
  const { locale } = await resolveSpeechLocale(lang);
  try {
    await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
      locale,
    });
  } catch {
    // optional enhancement
  }
}
