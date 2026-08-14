import {
  ExpoSpeechRecognitionResultEvent,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getVoiceLanguageOption } from '@/lib/services/voiceLanguages';
import {
  abortSpeechSession,
  normalizeSpeechTranscript,
  speechErrorMessage,
  SpeechCaptureMode,
  startSpeechSession,
  stopSpeechSession,
  TranscriptAccumulator,
} from '@/lib/services/speechRecognition';
import { submitVoiceCapture } from '@/lib/services/voiceCapture';
import { useSettingsStore } from '@/store/useSettingsStore';

type Options = {
  autoStart?: boolean;
  handsFree?: boolean;
  onSaved?: (title: string) => void;
  onError?: (message: string) => void;
};

export function useVoiceCapture(options: Options = {}) {
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');
  const getSettings = useSettingsStore((s) => s.getSettings);
  const langOption = getVoiceLanguageOption(voiceLanguage);
  const mode: SpeechCaptureMode =
    options.handsFree || options.autoStart ? 'handsFree' : 'hold';

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accumulatorRef = useRef(new TranscriptAccumulator());
  const startedRef = useRef(false);
  const submittingRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const submitTranscript = useCallback(
    async (raw: string) => {
      const text = normalizeSpeechTranscript(raw, voiceLanguage);
      if (!text || submittingRef.current) return;

      submittingRef.current = true;
      setBusy(true);
      try {
        const result = await submitVoiceCapture(text, getSettings());
        if (result.status === 'saved') {
          optionsRef.current.onSaved?.(result.title);
        }
      } catch {
        optionsRef.current.onError?.('Could not save that reminder');
      } finally {
        submittingRef.current = false;
        setBusy(false);
        accumulatorRef.current.reset();
        setTranscript('');
      }
    },
    [getSettings, voiceLanguage],
  );

  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const text = accumulatorRef.current.update(event);
    if (text) setTranscript(text);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const text = accumulatorRef.current.text;
    if (text) {
      submitTranscript(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    const message = speechErrorMessage(event.error);
    setHint(message);
    optionsRef.current.onError?.(message);
  });

  const startListening = useCallback(async () => {
    if (listening || busy) return;

    setHint(null);
    accumulatorRef.current.reset();
    setTranscript('');

    try {
      const session = await startSpeechSession(voiceLanguage, mode);
      setHint(session.hint);
      setListening(true);
    } catch (err) {
      setListening(false);
      const message =
        err instanceof Error ? err.message : 'Voice needs a native build';
      setHint(message);
      optionsRef.current.onError?.(message);
    }
  }, [busy, listening, mode, voiceLanguage]);

  const stopListening = useCallback(() => {
    if (!listening) return;
    try {
      stopSpeechSession();
    } catch {
      setListening(false);
      const text = accumulatorRef.current.text;
      if (text) submitTranscript(text);
    }
  }, [listening, submitTranscript]);

  useEffect(() => {
    if (!options.autoStart || startedRef.current) return;
    startedRef.current = true;
    startListening();
    return () => {
      abortSpeechSession();
    };
  }, [options.autoStart, startListening]);

  return {
    listening,
    transcript,
    hint,
    busy,
    startListening,
    stopListening,
    langOption,
    voiceLanguage,
  };
}
