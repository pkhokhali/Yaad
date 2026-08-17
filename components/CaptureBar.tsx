import { Ionicons } from '@expo/vector-icons';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useCopy } from '@/lib/i18n/copy';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import {
  abortSpeechSession,
  normalizeSpeechTranscript,
  speechErrorMessage,
  startSpeechSession,
  stopSpeechSession,
  TranscriptAccumulator,
} from '@/lib/services/speechRecognition';
import {
  getVoiceLanguageOption,
  listOnDeviceVoiceLanguages,
  nextVoiceLanguageFrom,
  VoiceLanguageOption,
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
  const [availableLangs, setAvailableLangs] = useState<VoiceLanguageOption[]>(
    [],
  );

  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [micHint, setMicHint] = useState<string | null>(null);
  const accumulatorRef = useRef(new TranscriptAccumulator());
  const wantedRef = useRef(false);
  const startingRef = useRef(false);
  const lastRestartRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    listOnDeviceVoiceLanguages().then((langs) => {
      if (cancelled) return;
      setAvailableLangs(langs);
      if (langs.length === 0) {
        setMicHint(copy.voiceUnavailable);
      } else if (voiceLanguage === 'new' && !langs.some((l) => l.value === 'new')) {
        setMicHint(copy.newariUnavailable);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [copy.newariUnavailable, copy.voiceUnavailable, voiceLanguage]);

  const finishWithTranscript = useCallback(() => {
    const finalText = normalizeSpeechTranscript(
      accumulatorRef.current.text || text.trim(),
      voiceLanguage,
    );
    accumulatorRef.current.reset();
    setText('');
    if (finalText) {
      onSubmitText(finalText);
    } else {
      setMicHint(copy.tapToSpeak);
    }
  }, [copy.tapToSpeak, onSubmitText, text, voiceLanguage]);

  const beginSession = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      await startSpeechSession(voiceLanguage, 'tap');
      if (!wantedRef.current) {
        abortSpeechSession();
        return;
      }
      setMicHint(copy.listening);
      setListening(true);
    } catch (err) {
      wantedRef.current = false;
      setListening(false);
      setMicHint(
        err instanceof Error ? err.message : 'Microphone permission needed',
      );
    } finally {
      startingRef.current = false;
    }
  }, [copy.listening, voiceLanguage]);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = accumulatorRef.current.update(event);
    if (transcript) setText(transcript);
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
    finishWithTranscript();
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (wantedRef.current && event.error === 'no-speech') {
      beginSession();
      return;
    }
    wantedRef.current = false;
    setListening(false);
    setMicHint(speechErrorMessage(event.error));
  });

  const submit = useCallback(() => {
    const value = text.trim();
    if (!value) return;
    onSubmitText(value);
    setText('');
  }, [text, onSubmitText]);

  const cycleLanguage = useCallback(() => {
    if (listening || wantedRef.current || availableLangs.length < 2) return;
    setMicHint(null);
    setVoiceLanguage(nextVoiceLanguageFrom(voiceLanguage, availableLangs));
  }, [availableLangs, listening, setVoiceLanguage, voiceLanguage]);

  const toggleListening = useCallback(() => {
    if (wantedRef.current) {
      wantedRef.current = false;
      setMicHint(null);
      try {
        stopSpeechSession();
      } catch {
        setListening(false);
        finishWithTranscript();
      }
      return;
    }

    setMicHint(copy.listening);
    wantedRef.current = true;
    accumulatorRef.current.reset();
    setText('');
    beginSession();
  }, [beginSession, copy.listening, finishWithTranscript]);

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
        {availableLangs.length > 1 ? (
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
        ) : null}
        <Pressable
          onPress={toggleListening}
          style={({ pressed }) => [
            styles.mic,
            {
              width: scale.minHitTarget,
              height: scale.minHitTarget,
              borderRadius: scale.minHitTarget / 2,
              backgroundColor: listening ? colors.accent : colors.accentSoft,
            },
            pressed && styles.micPressed,
          ]}
          accessibilityLabel={
            listening
              ? 'Stop listening'
              : `Tap to speak a reminder in ${langOption.nativeLabel}`
          }
        >
          {listening ? (
            <ActivityIndicator color="#1A1C21" size="small" />
          ) : (
            <Ionicons name="mic" size={20} color={colors.accent} />
          )}
        </Pressable>
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
