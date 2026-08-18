import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { VoiceListeningVisual } from '@/components/VoiceListeningVisual';
import { radii, spacing } from '@/constants/theme';
import { useCopy } from '@/lib/i18n/copy';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import {
  abortSpeechSession,
  normalizeSpeechTranscript,
  SPEECH_PAUSE_MS,
  speechErrorMessage,
  startSpeechSession,
  stopSpeechSession,
  TranscriptAccumulator,
} from '@/lib/services/speechRecognition';
import {
  getVoiceLanguageOption,
  nextVoiceLanguageFrom,
  VOICE_LANGUAGE_OPTIONS,
} from '@/lib/services/voiceLanguages';
import { useSettingsStore } from '@/store/useSettingsStore';

type Props = {
  onSubmitText: (text: string) => void;
  gutter?: number;
};

const PLACEHOLDERS = {
  en: 'walk at 7, take medicine at 8...',
  ne: 'रिमाइन्डर लेख्नुहोस्...',
  new: 'लुमंकेगु च्वयादिसँ...',
} as const;

export function CaptureBar({ onSubmitText, gutter = spacing.lg }: Props) {
  const { colors } = useTheme();
  const { scale } = useScale();
  const copy = useCopy();
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');
  const setVoiceLanguage = useSettingsStore((s) => s.setVoiceLanguage);
  const langOption = getVoiceLanguageOption(voiceLanguage);

  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [micHint, setMicHint] = useState<string | null>(null);
  const accumulatorRef = useRef(new TranscriptAccumulator());
  const wantedRef = useRef(false);
  const startingRef = useRef(false);
  const processedRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receivingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const finishWithTranscript = useCallback(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    const finalText = normalizeSpeechTranscript(
      accumulatorRef.current.text || text.trim(),
      voiceLanguage,
    );
    accumulatorRef.current.reset();
    setText('');
    setReceiving(false);
    if (finalText) {
      onSubmitText(finalText);
    } else {
      setMicHint(copy.tapToSpeak);
    }
  }, [copy.tapToSpeak, onSubmitText, text, voiceLanguage]);

  const stopAndProcess = useCallback(() => {
    wantedRef.current = false;
    clearSilenceTimer();
    setListening(false);
    try {
      stopSpeechSession();
    } catch {
      finishWithTranscript();
    }
  }, [clearSilenceTimer, finishWithTranscript]);

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (!wantedRef.current) return;
      stopAndProcess();
    }, SPEECH_PAUSE_MS);
  }, [clearSilenceTimer, stopAndProcess]);

  const beginSession = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      const started = await startSpeechSession(voiceLanguage, 'tap');
      if (!wantedRef.current) {
        abortSpeechSession();
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined,
      );
      setMicHint(started.hint ?? copy.listening);
      setListening(true);
      armSilenceTimer();
    } catch (err) {
      wantedRef.current = false;
      setListening(false);
      setReceiving(false);
      setMicHint(
        err instanceof Error ? err.message : 'Microphone permission needed',
      );
    } finally {
      startingRef.current = false;
    }
  }, [armSilenceTimer, copy.listening, voiceLanguage]);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = accumulatorRef.current.update(event);
    if (!transcript) return;
    setText(transcript);
    setReceiving(true);
    setMicHint(copy.hearingYou);
    if (receivingClearRef.current) clearTimeout(receivingClearRef.current);
    receivingClearRef.current = setTimeout(() => setReceiving(false), 400);
    armSilenceTimer();
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setReceiving(false);
    clearSilenceTimer();
    wantedRef.current = false;
    finishWithTranscript();
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'no-speech' || event.error === 'speech-timeout') {
      if (accumulatorRef.current.text || text.trim()) {
        stopAndProcess();
        return;
      }
    }
    wantedRef.current = false;
    clearSilenceTimer();
    setListening(false);
    setReceiving(false);
    setMicHint(speechErrorMessage(event.error));
  });

  const submit = useCallback(() => {
    const value = text.trim();
    if (!value) return;
    onSubmitText(value);
    setText('');
  }, [text, onSubmitText]);

  const cycleLanguage = useCallback(() => {
    if (listening || wantedRef.current) return;
    setMicHint(null);
    setVoiceLanguage(
      nextVoiceLanguageFrom(voiceLanguage, VOICE_LANGUAGE_OPTIONS),
    );
  }, [listening, setVoiceLanguage, voiceLanguage]);

  const toggleListening = useCallback(() => {
    if (wantedRef.current) {
      stopAndProcess();
      return;
    }

    setMicHint(copy.listening);
    wantedRef.current = true;
    processedRef.current = false;
    accumulatorRef.current.reset();
    setText('');
    beginSession();
  }, [beginSession, copy.listening, stopAndProcess]);

  useEffect(
    () => () => {
      clearSilenceTimer();
      if (receivingClearRef.current) clearTimeout(receivingClearRef.current);
      wantedRef.current = false;
      abortSpeechSession();
    },
    [clearSilenceTimer],
  );

  const micSize = scale.minHitTarget;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: gutter,
          backgroundColor: colors.background,
          borderTopColor: colors.borderHairline,
        },
      ]}
    >
      {micHint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{micHint}</Text>
      ) : null}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            minHeight: scale.minHitTarget,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text, fontSize: scale.body }]}
          placeholder={PLACEHOLDERS[voiceLanguage]}
          placeholderTextColor={colors.textSubtle}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="done"
          editable={!listening}
        />
        {text.trim() && !listening ? (
          <Pressable
            onPress={submit}
            style={styles.send}
            accessibilityLabel="Save typed reminder"
          >
            <Ionicons name="arrow-up" size={18} color="#1A1C21" />
          </Pressable>
        ) : null}
        <Pressable
          onPress={cycleLanguage}
          style={[
            styles.langChip,
            { backgroundColor: colors.accentSoft, borderColor: colors.border },
            listening && styles.langChipDisabled,
          ]}
          accessibilityLabel={`Voice language ${langOption.nativeLabel}. Tap to change.`}
          hitSlop={6}
        >
          <Text style={[styles.langChipText, { color: colors.accent }]}>
            {langOption.short}
          </Text>
        </Pressable>
        <View
          style={{
            width: micSize + 8,
            height: micSize + 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VoiceListeningVisual
            listening={listening}
            receiving={receiving}
            size={micSize}
          />
          <Pressable
            onPress={toggleListening}
            style={({ pressed }) => [
              styles.mic,
              {
                width: micSize,
                height: micSize,
                borderRadius: micSize / 2,
                backgroundColor: listening ? colors.accent : colors.accentSoft,
                zIndex: 1,
              },
              pressed && styles.micPressed,
            ]}
            accessibilityLabel={
              listening
                ? 'Stop listening'
                : `Tap to speak a reminder in ${langOption.nativeLabel}`
            }
          >
            <Ionicons
              name={listening ? 'radio' : 'mic'}
              size={20}
              color={listening ? '#1A1C21' : colors.accent}
            />
          </Pressable>
        </View>
      </View>
      {Platform.OS === 'ios' ? <View style={styles.homeIndicator} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    fontSize: 12,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    minHeight: 52,
    gap: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB300',
  },
  langChip: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  langChipDisabled: {
    opacity: 0.5,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPressed: {
    opacity: 0.9,
  },
  homeIndicator: {
    height: 8,
  },
});
