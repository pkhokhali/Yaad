import { Ionicons } from '@expo/vector-icons';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
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
  nextVoiceLanguage,
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
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');
  const setVoiceLanguage = useSettingsStore((s) => s.setVoiceLanguage);
  const langOption = getVoiceLanguageOption(voiceLanguage);

  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [micHint, setMicHint] = useState<string | null>(null);
  const accumulatorRef = useRef(new TranscriptAccumulator());
  const wantedRef = useRef(false);
  const startingRef = useRef(false);

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
      setMicHint('Tap the mic, speak, then tap again');
    }
  }, [onSubmitText, text, voiceLanguage]);

  const beginSession = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      const session = await startSpeechSession(voiceLanguage, 'tap');
      if (!wantedRef.current) {
        abortSpeechSession();
        return;
      }
      setMicHint(session.hint ?? 'Listening — tap the mic when you’re done');
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
  }, [voiceLanguage]);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = accumulatorRef.current.update(event);
    if (transcript) setText(transcript);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    if (wantedRef.current) {
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
    if (listening || wantedRef.current) return;
    setMicHint(null);
    setVoiceLanguage(nextVoiceLanguage(voiceLanguage));
  }, [listening, setVoiceLanguage, voiceLanguage]);

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

    setMicHint('Listening — tap the mic when you’re done');
    wantedRef.current = true;
    accumulatorRef.current.reset();
    setText('');
    beginSession();
  }, [beginSession, finishWithTranscript]);

  return (
    <View style={[styles.wrap, { paddingHorizontal: gutter }]}>
      {micHint ? <Text style={styles.hint}>{micHint}</Text> : null}
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
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
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        ) : null}
        <Pressable
          onPress={cycleLanguage}
          style={[styles.langChip, listening && styles.langChipDisabled]}
          accessibilityLabel={`Voice language ${langOption.nativeLabel}. Tap to change.`}
          hitSlop={6}
        >
          <Text style={styles.langChipText}>{langOption.short}</Text>
        </Pressable>
        <Pressable
          onPress={toggleListening}
          style={({ pressed }) => [
            styles.mic,
            listening && styles.micActive,
            pressed && styles.micPressed,
          ]}
          accessibilityLabel={
            listening
              ? 'Stop listening'
              : `Tap to speak a reminder in ${langOption.nativeLabel}`
          }
        >
          {listening ? (
            <ActivityIndicator color="#fff" size="small" />
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
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderHairline,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    minHeight: 52,
    gap: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  langChip: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  langChipDisabled: {
    opacity: 0.5,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  mic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  micActive: {
    backgroundColor: colors.accent,
  },
  micPressed: {
    opacity: 0.9,
  },
  homeIndicator: {
    height: 8,
  },
});
