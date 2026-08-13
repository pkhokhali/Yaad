import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useRouter } from 'expo-router';
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
import { parseCaptureText } from '@/lib/services/parser';
import {
  getVoiceLanguageOption,
  nextVoiceLanguage,
  resolveSpeechLocale,
} from '@/lib/services/voiceLanguages';
import { useReminderStore } from '@/store/useReminderStore';
import { useSettingsStore } from '@/store/useSettingsStore';

type Props = {
  onSubmitText: (text: string) => void;
};

const PLACEHOLDERS = {
  en: 'type a reminder...',
  ne: 'रिमाइन्डर लेख्नुहोस्...',
  new: 'लुमंकेगु च्वयादिसँ...',
} as const;

export function CaptureBar({ onSubmitText }: Props) {
  const router = useRouter();
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');
  const setVoiceLanguage = useSettingsStore((s) => s.setVoiceLanguage);
  const getSettings = useSettingsStore((s) => s.getSettings);
  const addReminder = useReminderStore((s) => s.addReminder);
  const langOption = getVoiceLanguageOption(voiceLanguage);

  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [micHint, setMicHint] = useState<string | null>(null);
  const interimRef = useRef('');
  const holdActive = useRef(false);

  const handleVoiceCapture = useCallback(
    async (finalText: string) => {
      try {
        const parsed = await parseCaptureText(finalText);
        if (parsed.confident) {
          await addReminder(
            {
              title: parsed.title,
              notes: parsed.rawText,
              due_at: parsed.dueAt.getTime(),
              category: parsed.category,
            },
            getSettings(),
          );
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          setMicHint(`Saved · ${parsed.title}`);
          return;
        }
      } catch {
        // Fall through to the confirm screen
      }
      router.push({
        pathname: '/add',
        params: { draft: finalText, fromVoice: '1' },
      });
    },
    [addReminder, getSettings, router],
  );
  const handleVoiceCaptureRef = useRef(handleVoiceCapture);
  handleVoiceCaptureRef.current = handleVoiceCapture;

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript?.trim();
    if (transcript) {
      interimRef.current = transcript;
      setText(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const finalText = interimRef.current.trim();
    if (finalText && holdActive.current === false) {
      handleVoiceCaptureRef.current(finalText);
      setText('');
      interimRef.current = '';
    } else if (!finalText) {
      setMicHint(null);
    }
  });

  useSpeechRecognitionEvent('error', () => {
    setListening(false);
    setMicHint('Couldn’t hear that — try typing');
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
    try {
      const perm =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setMicHint('Microphone permission needed');
        holdActive.current = false;
        return;
      }
      const resolved = await resolveSpeechLocale(voiceLanguage);
      if (resolved.usedFallback && voiceLanguage === 'new') {
        setMicHint('Newari isn’t on this phone — listening in Nepali');
      } else {
        setMicHint(langOption.hint);
      }
      interimRef.current = '';
      setListening(true);
      ExpoSpeechRecognitionModule.start({
        lang: resolved.locale,
        interimResults: true,
        continuous: false,
        contextualStrings: langOption.contextualStrings,
      });
    } catch {
      holdActive.current = false;
      setListening(false);
      setMicHint('Hold mic in a native build, or type instead');
    }
  }, [langOption, voiceLanguage]);

  const stopListening = useCallback(() => {
    holdActive.current = false;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      setListening(false);
      const finalText = interimRef.current.trim() || text.trim();
      if (finalText) {
        handleVoiceCaptureRef.current(finalText);
        setText('');
        interimRef.current = '';
      }
    }
  }, [text]);

  return (
    <View style={styles.wrap}>
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
    paddingHorizontal: spacing.lg,
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
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: 52,
    gap: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
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
