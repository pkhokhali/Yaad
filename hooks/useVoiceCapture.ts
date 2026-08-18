import * as Haptics from 'expo-haptics';
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
  SPEECH_PAUSE_MS,
  speechErrorMessage,
  startSpeechSession,
  stopSpeechSession,
  TranscriptAccumulator,
} from '@/lib/services/speechRecognition';
import { submitVoiceCapture } from '@/lib/services/voiceCapture';
import { VoiceAddKind } from '@/lib/services/voiceGuide';
import { useSettingsStore } from '@/store/useSettingsStore';

type Options = {
  autoStart?: boolean;
  handsFree?: boolean;
  captureKind?: VoiceAddKind;
  onSaved?: (title: string) => void;
  onError?: (message: string) => void;
  /** Return handled to skip default save flow. */
  onTranscript?: (text: string) => Promise<'handled' | 'default'>;
};

export function useVoiceCapture(options: Options = {}) {
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');
  const uiLanguage = useSettingsStore((s) => s.uiLanguage ?? 'en');
  const getSettings = useSettingsStore((s) => s.getSettings);
  const langOption = getVoiceLanguageOption(voiceLanguage);

  const [listening, setListening] = useState(false);
  const [receiving, setReceiving] = useState(false);
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
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receivingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const submitTranscript = useCallback(
    async (raw: string) => {
      const text = normalizeSpeechTranscript(raw, voiceLanguage);
      if (!text || submittingRef.current) return;

      submittingRef.current = true;
      setBusy(true);
      setReceiving(false);
      try {
        if (optionsRef.current.onTranscript) {
          const action = await optionsRef.current.onTranscript(text);
          if (action === 'handled') return;
        }
        const kind = optionsRef.current.captureKind ?? 'reminder';
        const result = await submitVoiceCapture(text, getSettings(), kind);
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

  const finishListening = useCallback(
    (process: boolean) => {
      wantedRef.current = false;
      clearSilenceTimer();
      setListening(false);
      setReceiving(false);
      const text = accumulatorRef.current.text;
      accumulatorRef.current.reset();
      try {
        stopSpeechSession();
      } catch {
        // already stopped
      }
      if (process && text) submitTranscript(text);
    },
    [clearSilenceTimer, submitTranscript],
  );

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (!wantedRef.current) return;
      finishListening(true);
    }, SPEECH_PAUSE_MS);
  }, [clearSilenceTimer, finishListening]);

  const beginSession = useCallback(async () => {
    if (startingRef.current || !wantedRef.current) return;
    startingRef.current = true;
    try {
      const started = await startSpeechSession(voiceLanguage, 'tap');
      if (!wantedRef.current) {
        abortSpeechSession();
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
        () => undefined,
      );
      const copy = copyForLanguage(uiLanguage);
      setHint(started.hint ?? copy.listening);
      setListening(true);
      armSilenceTimer();
    } catch (err) {
      wantedRef.current = false;
      setListening(false);
      setReceiving(false);
      const message =
        err instanceof Error ? err.message : 'Microphone permission needed';
      setHint(message);
      optionsRef.current.onError?.(message);
    } finally {
      startingRef.current = false;
    }
  }, [armSilenceTimer, uiLanguage, voiceLanguage]);

  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const text = accumulatorRef.current.update(event);
    if (!text) return;
    setTranscript(text);
    setReceiving(true);
    setHint(copyForLanguage(uiLanguage).hearingYou);
    if (receivingClearRef.current) clearTimeout(receivingClearRef.current);
    receivingClearRef.current = setTimeout(() => setReceiving(false), 400);
    armSilenceTimer();
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setReceiving(false);
    clearSilenceTimer();
    const text = accumulatorRef.current.text;
    wantedRef.current = false;
    accumulatorRef.current.reset();
    if (text) submitTranscript(text);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'no-speech' || event.error === 'speech-timeout') {
      const text = accumulatorRef.current.text;
      if (text) {
        finishListening(true);
        return;
      }
    }
    wantedRef.current = false;
    clearSilenceTimer();
    setListening(false);
    setReceiving(false);
    const message = speechErrorMessage(event.error);
    setHint(message);
    optionsRef.current.onError?.(message);
  });

  const startListening = useCallback(async () => {
    if (wantedRef.current || busy) return;
    setHint(copyForLanguage(uiLanguage).listening);
    wantedRef.current = true;
    accumulatorRef.current.reset();
    setTranscript('');
    setReceiving(false);
    await beginSession();
  }, [beginSession, busy, uiLanguage]);

  const stopListening = useCallback(() => {
    if (!wantedRef.current && !listening) return;
    finishListening(true);
  }, [finishListening, listening]);

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
      clearSilenceTimer();
      abortSpeechSession();
    };
    // startListening is intentionally omitted — auto-start runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.autoStart]);

  useEffect(
    () => () => {
      clearSilenceTimer();
      if (receivingClearRef.current) clearTimeout(receivingClearRef.current);
    },
    [clearSilenceTimer],
  );

  return {
    listening,
    receiving,
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
