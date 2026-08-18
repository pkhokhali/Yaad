import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { VoiceListeningVisual } from '@/components/VoiceListeningVisual';
import { radii, spacing } from '@/constants/theme';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useResponsive } from '@/hooks/useResponsive';
import { useCopy } from '@/lib/i18n/copy';
import { submitVoiceCapture } from '@/lib/services/voiceCapture';
import {
  kindLabel,
  promptCapture,
  VoiceAddKind,
} from '@/lib/services/voiceGuide';
import { useTheme } from '@/providers/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';

type GuidedPhase = 'pick' | 'capture';

const KINDS: VoiceAddKind[] = ['todo', 'reminder', 'expense'];

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
  const uiLanguage = useSettingsStore((s) => s.uiLanguage ?? 'en');
  const [status, setStatus] = useState<string | null>(null);
  const [handlingDraft, setHandlingDraft] = useState(false);
  const [guidedPhase, setGuidedPhase] = useState<GuidedPhase>('pick');
  const [selectedKind, setSelectedKind] = useState<VoiceAddKind | null>(null);
  const [screenHint, setScreenHint] = useState<string | null>(null);
  const styles = useMemo(() => makeCaptureStyles(colors), [colors]);

  const isGuided = params.flow === 'guided';
  const autoListen = params.voice !== '0' && !isGuided;
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
      if (!isGuided || !selectedKind) return 'default';
      const result = await submitVoiceCapture(text, getSettings(), selectedKind);
      if (result.status === 'saved') {
        handleSaved(result.title);
      }
      return 'handled';
    },
    [getSettings, handleSaved, isGuided, selectedKind],
  );

  const {
    listening,
    receiving,
    transcript,
    hint,
    busy,
    toggleListening,
    startListening,
    langOption,
  } = useVoiceCapture({
    autoStart: autoListen && !draft,
    captureKind: selectedKind ?? 'reminder',
    onSaved: handleSaved,
    onError: (message) => setStatus(message),
    onTranscript: isGuided ? onGuidedTranscript : undefined,
  });

  const chooseKind = useCallback(
    (kind: VoiceAddKind) => {
      setSelectedKind(kind);
      setGuidedPhase('capture');
      const next = promptCapture(kind, uiLanguage === 'ne' ? 'ne' : 'en');
      setScreenHint(next);
      setStatus(kindLabel(kind, uiLanguage === 'ne' ? 'ne' : 'en'));
      void startListening();
    },
    [startListening, uiLanguage],
  );

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
      ? copy.tabs.voice
      : kindLabel(selectedKind ?? 'reminder', uiLanguage === 'ne' ? 'ne' : 'en')
    : listening
      ? receiving
        ? copy.hearingYou
        : copy.listening
      : copy.tapToSpeak;

  const subtitleText =
    screenHint ??
    hint ??
    (isGuided
      ? copy.pickWhatToAdd
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

  const showMic = !isGuided || guidedPhase === 'capture';

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

          {isGuided && guidedPhase === 'pick' ? (
            <View style={styles.kindRow}>
              {KINDS.map((kind) => (
                <Pressable
                  key={kind}
                  onPress={() => chooseKind(kind)}
                  style={({ pressed }) => [
                    styles.kindBtn,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    pressed && styles.micOrbPressed,
                  ]}
                >
                  <Ionicons
                    name={
                      kind === 'todo'
                        ? 'checkmark-circle-outline'
                        : kind === 'expense'
                          ? 'card-outline'
                          : 'notifications-outline'
                    }
                    size={s(22)}
                    color={colors.accent}
                  />
                  <Text style={[styles.kindLabel, { color: colors.text }]}>
                    {kindLabel(kind, uiLanguage === 'ne' ? 'ne' : 'en')}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcript}>{transcript}</Text>
            </View>
          ) : null}

          {status ? <Text style={styles.status}>{status}</Text> : null}

          {showMic ? (
            <>
              <View
                style={{
                  width: orb + 36,
                  height: orb + 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VoiceListeningVisual
                  listening={listening}
                  receiving={receiving}
                  size={orb}
                />
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
              </View>

              <Text style={styles.footerHint}>
                {listening
                  ? receiving
                    ? copy.hearingYou
                    : copy.pauseWillSave
                  : copy.tapToSpeak}
              </Text>
            </>
          ) : null}
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
    kindRow: {
      width: '100%',
      gap: spacing.sm,
    },
    kindBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
    },
    kindLabel: {
      fontSize: 18,
      fontWeight: '700',
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
      zIndex: 1,
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
