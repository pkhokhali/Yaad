import { Ionicons } from '@expo/vector-icons';
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

type Props = {
  onSubmitText: (text: string) => void;
};

export function CaptureBar({ onSubmitText }: Props) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [micHint, setMicHint] = useState<string | null>(null);
  const interimRef = useRef('');
  const holdActive = useRef(false);

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
      router.push({
        pathname: '/add',
        params: { draft: finalText, fromVoice: '1' },
      });
      setText('');
      interimRef.current = '';
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
      interimRef.current = '';
      setListening(true);
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch {
      holdActive.current = false;
      setListening(false);
      setMicHint('Hold mic in a native build, or type instead');
    }
  }, []);

  const stopListening = useCallback(() => {
    holdActive.current = false;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      setListening(false);
      const finalText = interimRef.current.trim() || text.trim();
      if (finalText) {
        router.push({
          pathname: '/add',
          params: { draft: finalText, fromVoice: '1' },
        });
        setText('');
        interimRef.current = '';
      }
    }
  }, [router, text]);

  return (
    <View style={styles.wrap}>
      {micHint ? <Text style={styles.hint}>{micHint}</Text> : null}
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          placeholder="type a reminder..."
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
          onPressIn={startListening}
          onPressOut={stopListening}
          style={({ pressed }) => [
            styles.mic,
            listening && styles.micActive,
            pressed && styles.micPressed,
          ]}
          accessibilityLabel="Hold to speak a reminder"
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
