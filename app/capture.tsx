import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentColumn } from '@/components/ContentColumn';
import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { radii, spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useCopy } from '@/lib/i18n/copy';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { submitVoiceCapture } from '@/lib/services/voiceCapture';
import { useTheme } from '@/providers/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function VoiceCaptureScreen() {
  const router = useRouter();
  const { gutter, s, height, isLandscape } = useResponsive();
  const { colors } = useTheme();
  const copy = useCopy();
  const params = useLocalSearchParams<{ draft?: string; voice?: string }>();
  const getSettings = useSettingsStore((s) => s.getSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [handlingDraft, setHandlingDraft] = useState(false);
  const styles = useMemo(() => makeCaptureStyles(colors), [colors]);

  const autoListen = params.voice !== '0';
  const draft = typeof params.draft === 'string' ? params.draft.trim() : '';
  const orb = Math.min(s(112), Math.round(height * (isLandscape ? 0.28 : 0.18)));

  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');

  const examples =
    voiceLanguage === 'ne'
      ? '“मलाई सम्झाउ आमा लाई फोन गर्न २ मिनेट पछि”'
      : voiceLanguage === 'new'
        ? '“लुमंकेगु आमा याः कल जाः”'
        : '“remind me to call mom after 2 minutes”';

  const { listening, transcript, hint, busy, toggleListening, langOption } =
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
      <ContentColumn>
        <View style={[styles.header, { paddingHorizontal: gutter }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={s(28)} color={colors.textMuted} />
          </Pressable>
          <MemoryNodeIcon size={s(30)} />
          <View style={{ width: s(28) }} />
        </View>

        <View style={[styles.center, { paddingHorizontal: gutter }]}>
          <Text style={[styles.title, { fontSize: s(28) }]}>
            {listening ? copy.listening : copy.tapToSpeak}
          </Text>
          <Text style={styles.subtitle}>
            {hint ?? `Try: ${examples} · ${langOption.nativeLabel}`}
          </Text>

          {transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcript}>{transcript}</Text>
            </View>
          ) : null}

          {status ? <Text style={styles.status}>{status}</Text> : null}

          <Pressable
            onPress={toggleListening}
            disabled={busy}
            style={({ pressed }) => [
              styles.micOrb,
              {
                width: orb,
                height: orb,
                borderRadius: orb / 2,
              },
              listening && styles.micOrbActive,
              pressed && styles.micOrbPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Ionicons
                name={listening ? 'radio' : 'mic'}
                size={Math.round(orb * 0.38)}
                color="#fff"
              />
            )}
          </Pressable>

          <Text style={styles.footerHint}>
            {listening
              ? copy.tapMicAgain
              : copy.tapToSpeak}
          </Text>
        </View>
      </ContentColumn>
    </SafeAreaView>
  );
}

function makeCaptureStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  title: {
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
}
