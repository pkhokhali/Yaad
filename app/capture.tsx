import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useResponsive } from '@/hooks/useResponsive';
import { useCopy } from '@/lib/i18n/copy';
import { announceReminder } from '@/lib/services/announce';
import { submitVoiceCapture } from '@/lib/services/voiceCapture';
import {
  guidedFlowHint,
  kindLabel,
  kindSelectedMessage,
  parseVoiceAddKind,
  promptCapture,
  promptPickType,
  promptRetryPickType,
  VoiceAddKind,
} from '@/lib/services/voiceGuide';
import { useTheme } from '@/providers/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';

type GuidedPhase = 'pick' | 'capture';

export default function VoiceCaptureScreen() {
  const router = useRouter();
  const { gutter, s, height, isLandscape } = useResponsive();
  const { colors } = useTheme();
  const copy = useCopy();
  const params = useLocalSearchParams<{
    draft?: string;
    voice?: string;
    flow?: string;
  }>();
  const getSettings = useSettingsStore((s) => s.getSettings);
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');
  const [status, setStatus] = useState<string | null>(null);
  const [handlingDraft, setHandlingDraft] = useState(false);
  const [guidedPhase, setGuidedPhase] = useState<GuidedPhase>('pick');
  const [selectedKind, setSelectedKind] = useState<VoiceAddKind | null>(null);
  const [screenHint, setScreenHint] = useState<string | null>(null);
  const promptedRef = useRef(false);
  const styles = useMemo(() => makeCaptureStyles(colors), [colors]);

  const isGuided = params.flow === 'guided';
  const autoListen = params.voice !== '0';
  const draft = typeof params.draft === 'string' ? params.draft.trim() : '';
  const orb = Math.min(s(112), Math.round(height * (isLandscape ? 0.28 : 0.18)));

  const handleSaved = useCallback(
    (title: string) => {
      setStatus(`Saved · ${title}`);
      setTimeout(() => router.back(), 900);
    },
    [router],
  );

  const onGuidedTranscript = useCallback(
    async (text: string): Promise<'handled' | 'default'> => {
      if (!isGuided) return 'default';

      if (guidedPhase === 'pick') {
        const kind = parseVoiceAddKind(text);
        if (!kind) {
          const retry = promptRetryPickType(voiceLanguage);
          setScreenHint(retry);
          setStatus(retry);
          announceReminder(retry, voiceLanguage);
          void startListeningRef.current?.();
          return 'handled';
        }
        setSelectedKind(kind);
        setGuidedPhase('capture');
        const next = promptCapture(kind, voiceLanguage);
        setScreenHint(next);
        setStatus(kindSelectedMessage(kind, voiceLanguage));
        announceReminder(next, voiceLanguage);
        void startListeningRef.current?.();
        return 'handled';
      }

      if (selectedKind) {
        const result = await submitVoiceCapture(text, getSettings(), selectedKind);
        if (result.status === 'saved') {
          handleSaved(result.title);
        }
        return 'handled';
      }

      return 'default';
    },
    [getSettings, guidedPhase, handleSaved, isGuided, selectedKind, voiceLanguage],
  );

  const startListeningRef = useRef<(() => Promise<void>) | null>(null);

  const { listening, transcript, hint, busy, toggleListening, startListening, langOption } =
    useVoiceCapture({
      autoStart: autoListen && !draft && !isGuided,
      captureKind: selectedKind ?? 'reminder',
      onSaved: handleSaved,
      onError: (message) => setStatus(message),
      onTranscript: isGuided ? onGuidedTranscript : undefined,
    });

  startListeningRef.current = startListening;

  useEffect(() => {
    if (!isGuided || promptedRef.current || draft) return;
    promptedRef.current = true;
    const intro = promptPickType(voiceLanguage);
    setScreenHint(intro);
    announceReminder(intro, voiceLanguage);
    void startListening();
  }, [draft, isGuided, startListening, voiceLanguage]);

  useEffect(() => {
    if (!draft || handlingDraft) return;
    setHandlingDraft(true);
    (async () => {
      const result = await submitVoiceCapture(draft, getSettings());
      if (result.status === 'saved') {
        handleSaved(result.title);
      }
    })();
  }, [draft, getSettings, handleSaved, handlingDraft]);

  const titleText = isGuided
    ? guidedPhase === 'pick'
      ? 'Yaad Voice'
      : kindLabel(selectedKind ?? 'reminder', voiceLanguage)
    : listening
      ? copy.listening
      : copy.tapToSpeak;

  const subtitleText =
    screenHint ??
    hint ??
    (isGuided
      ? guidedFlowHint(voiceLanguage)
      : `Try speaking in ${langOption.nativeLabel}`);

  if (draft) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.subtitle}>Adding…</Text>
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
          <Text style={[styles.title, { fontSize: s(28) }]}>{titleText}</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>

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
            {listening ? copy.tapMicAgain : copy.tapToSpeak}
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
      textAlign: 'center',
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
