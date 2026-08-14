import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { submitVoiceCapture } from '@/lib/services/voiceCapture';
import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { brand, colors, radii, spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function VoiceCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draft?: string; voice?: string }>();
  const getSettings = useSettingsStore((s) => s.getSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [handlingDraft, setHandlingDraft] = useState(false);

  const autoListen = params.voice !== '0';
  const draft = typeof params.draft === 'string' ? params.draft.trim() : '';

  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');

  const examples =
    voiceLanguage === 'ne'
      ? '“मलाई सम्झाउ आमा लाई फोन गर्न २ मिनेट पछि”'
      : voiceLanguage === 'new'
        ? '“लुमंकेगु आमा याः कल जाः”'
        : '“remind me to call mom after 2 minutes”';

  const { listening, transcript, hint, busy, startListening, stopListening, langOption } =
    useVoiceCapture({
      autoStart: autoListen && !draft,
      handsFree: autoListen && !draft,
      onSaved: (title) => {
        setStatus(`Saved · ${title}`);
        setTimeout(() => router.back(), 900);
      },
      onError: (message) => setStatus(message),
    });

  useEffect(() => {
    if (!draft || handlingDraft) return;
    setHandlingDraft(true);
    (async () => {
      const result = await submitVoiceCapture(draft, getSettings());
      if (result.status === 'saved') {
        setStatus(`Saved · ${result.title}`);
        setTimeout(() => router.back(), 900);
      } else if (result.status === 'confirm') {
        router.replace({
          pathname: '/add',
          params: { draft, fromVoice: '1' },
        });
      }
    })();
  }, [draft, getSettings, handlingDraft, router]);

  if (draft) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.subtitle}>Adding your reminder…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <MemoryNodeIcon size={30} />
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.center}>
        <Text style={styles.title}>
          {listening
            ? autoListen
              ? 'Speak your reminder…'
              : 'Listening…'
            : 'Tap to speak'}
        </Text>
        <Text style={styles.subtitle}>
          {hint ??
            (autoListen
              ? `Try: ${examples} · ${langOption.nativeLabel}`
              : `Hold the mic, speak, then release · ${langOption.nativeLabel}`)}
        </Text>

        {transcript ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcript}>{transcript}</Text>
          </View>
        ) : null}

        {status ? <Text style={styles.status}>{status}</Text> : null}

        <Pressable
          onPressIn={startListening}
          onPressOut={stopListening}
          disabled={busy}
          style={({ pressed }) => [
            styles.micOrb,
            listening && styles.micOrbActive,
            pressed && styles.micOrbPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Ionicons
              name={listening ? 'radio' : 'mic'}
              size={42}
              color="#fff"
            />
          )}
        </Pressable>

        <Text style={styles.footerHint}>
          {listening
            ? autoListen
              ? 'Yaad saves when you finish speaking'
              : 'Release when you’re done speaking'
            : 'Hold the orb, speak, then release'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  transcriptBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  transcript: {
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  status: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  micOrb: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  micOrbActive: {
    backgroundColor: colors.accent,
  },
  micOrbPressed: {
    opacity: 0.92,
  },
  footerHint: {
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
  },
});
