import {
  ExpoSpeechRecognitionResultEvent,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';

import { copyForLanguage } from '@/lib/i18n/copy';
import { getVoiceLanguageOption } from '@/lib/services/voiceLanguages';
import {
  abortSpeechSession,
  normalizeSpeechTranscript,
  speechErrorMessage,
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

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accumulatorRef = useRef(new TranscriptAccumulator());
  const wantedRef = useRef(false);
  const startingRef = useRef(false);
  const startedRef = useRef(false);
  const submittingRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const lastRestartRef = useRef(0);

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

  const beginSession = useCallback(async () => {
    if (startingRef.current || !wantedRef.current) return;
    startingRef.current = true;
    try {
      await startSpeechSession(voiceLanguage, 'tap');
      if (!wantedRef.current) {
        abortSpeechSession();
        return;
      }
      setHint(copyForLanguage(voiceLanguage).listening);
      setListening(true);
    } catch (err) {
      wantedRef.current = false;
      setListening(false);
      const message =
        err instanceof Error ? err.message : 'Microphone permission needed';
      setHint(message);
      optionsRef.current.onError?.(message);
    } finally {
      startingRef.current = false;
    }
  }, [voiceLanguage]);

  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const text = accumulatorRef.current.update(event);
    if (text) setTranscript(text);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    if (wantedRef.current) {
      const now = Date.now();
      if (now - lastRestartRef.current < 400) {
        wantedRef.current = false;
        return;
      }
      lastRestartRef.current = now;
      beginSession();
      return;
    }
    const text = accumulatorRef.current.text;
    if (text) submitTranscript(text);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (wantedRef.current && event.error === 'no-speech') {
      beginSession();
      return;
    }
    wantedRef.current = false;
    setListening(false);
    const message = speechErrorMessage(event.error);
    setHint(message);
    optionsRef.current.onError?.(message);
  });

  const startListening = useCallback(async () => {
    if (wantedRef.current || busy) return;
    setHint('Listening — tap when you’re done');
    wantedRef.current = true;
    accumulatorRef.current.reset();
    setTranscript('');
    await beginSession();
  }, [beginSession, busy]);

  const stopListening = useCallback(() => {
    if (!wantedRef.current && !listening) return;
    wantedRef.current = false;
    try {
      stopSpeechSession();
    } catch {
      setListening(false);
      const text = accumulatorRef.current.text;
      if (text) submitTranscript(text);
    }
  }, [listening, submitTranscript]);

  const toggleListening = useCallback(() => {
    if (wantedRef.current || listening) {
      stopListening();
      return;
    }
    startListening();
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    if (!options.autoStart || startedRef.current) return;
    startedRef.current = true;
    startListening();
    return () => {
      wantedRef.current = false;
      abortSpeechSession();
    };
    // startListening is intentionally omitted — auto-start runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.autoStart]);

  return {
    listening,
    transcript,
    hint,
    busy,
    startListening,
    stopListening,
    toggleListening,
    langOption,
    voiceLanguage,
  };
}
