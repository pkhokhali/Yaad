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
  normalizeSpeechTranscript,
  speechErrorMessage,
  startSpeechSession,
  stopSpeechSession,
  TranscriptAccumulator,
} from '@/lib/services/speechRecognition';
import { openVoiceCapture, submitVoiceCapture } from '@/lib/services/voiceCapture';
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
  en: 'take medicine at 8...',
  ne: 'रिमाइन्डर लेख्नुहोस्...',
  new: 'लुमंकेगु च्वयादिसँ...',
} as const;

export function CaptureBar({ onSubmitText, gutter = spacing.lg }: Props) {
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');
  const setVoiceLanguage = useSettingsStore((s) => s.setVoiceLanguage);
  const getSettings = useSettingsStore((s) => s.getSettings);
  const langOption = getVoiceLanguageOption(voiceLanguage);

  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [micHint, setMicHint] = useState<string | null>(null);
  const accumulatorRef = useRef(new TranscriptAccumulator());
  const holdActive = useRef(false);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = accumulatorRef.current.update(event);
    if (transcript) setText(transcript);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const finalText = normalizeSpeechTranscript(
      accumulatorRef.current.text,
      voiceLanguage,
    );
    if (finalText && holdActive.current === false) {
      submitVoiceCapture(finalText, getSettings()).then((result) => {
        if (result.status === 'saved') {
          setMicHint(`Saved · ${result.title}`);
        }
      });
      setText('');
      accumulatorRef.current.reset();
    } else if (!finalText) {
      setMicHint(null);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    holdActive.current = false;
    setMicHint(speechErrorMessage(event.error));
  });

  const submit = useCallback(() => {
    const value = text.trim();
    if (!value) return;
    onSubmitText(value);
    setText('');
  }, [text, onSubmitText]);

  const cycleLanguage = useCallback(() => {
    if (listening) return;
    setMicHint(null);
    setVoiceLanguage(nextVoiceLanguage(voiceLanguage));
  }, [listening, setVoiceLanguage, voiceLanguage]);

  const startListening = useCallback(async () => {
    setMicHint(null);
    holdActive.current = true;
    accumulatorRef.current.reset();
    try {
      const session = await startSpeechSession(voiceLanguage, 'hold');
      setMicHint(session.hint ?? langOption.hint);
      setListening(true);
    } catch (err) {
      holdActive.current = false;
      setListening(false);
      setMicHint(
        err instanceof Error ? err.message : 'Hold mic in a native build, or type instead',
      );
    }
  }, [langOption, voiceLanguage]);

  const stopListening = useCallback(() => {
    holdActive.current = false;
    try {
      stopSpeechSession();
    } catch {
      setListening(false);
      const finalText = normalizeSpeechTranscript(
        accumulatorRef.current.text || text.trim(),
        voiceLanguage,
      );
      if (finalText) {
        submitVoiceCapture(finalText, getSettings()).then((result) => {
          if (result.status === 'saved') {
            setMicHint(`Saved · ${result.title}`);
          }
        });
        setText('');
        accumulatorRef.current.reset();
      }
    }
  }, [getSettings, text, voiceLanguage]);

  return (
    <View style={[styles.wrap, { paddingHorizontal: gutter }]}>
      {micHint ? <Text style={styles.hint}>{micHint}</Text> : null}
      <View style={styles.bar}>
        <Pressable
          onPress={() => openVoiceCapture()}
          style={styles.assistBtn}
          accessibilityLabel="Open hands-free voice capture"
        >
          <Ionicons name="sparkles" size={16} color={colors.accent} />
        </Pressable>
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
          onPressIn={startListening}
          onPressOut={stopListening}
          style={({ pressed }) => [
            styles.mic,
            listening && styles.micActive,
            pressed && styles.micPressed,
          ]}
          accessibilityLabel={`Hold to speak a reminder in ${langOption.nativeLabel}`}
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
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
    minHeight: 52,
    gap: 4,
  },
  assistBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
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
