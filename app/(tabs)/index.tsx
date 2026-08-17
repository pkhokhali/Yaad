import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/AdBanner';
import { CaptureBar } from '@/components/CaptureBar';
import { ContentColumn } from '@/components/ContentColumn';
import { HeroReminderCard } from '@/components/HeroReminderCard';
import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { ReminderCard } from '@/components/ReminderCard';
import { StreakBadge } from '@/components/StreakBadge';
import { spacing } from '@/constants/theme';
import { useCopy } from '@/lib/i18n/copy';
import { useResponsive } from '@/hooks/useResponsive';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useYaadItemStore } from '@/store/useYaadItemStore';
import { useSettingsStore } from '@/store/useSettingsStore';

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export default function HomeScreen() {
  const router = useRouter();
  const { gutter } = useResponsive();
  const { colors } = useTheme();
  const { scale } = useScale();
  const copy = useCopy();
  const [laterOpen, setLaterOpen] = useState(false);

  const reminders = useYaadItemStore((s) => s.reminders);
  const streak = useYaadItemStore((s) => s.streak);
  const highlightId = useYaadItemStore((s) => s.highlightId);
  const bootstrapping = useYaadItemStore((s) => s.bootstrapping);
  const storeReady = useYaadItemStore((s) => s.ready);
  const completeReminder = useYaadItemStore((s) => s.completeReminder);
  const toggleChecklistItem = useYaadItemStore((s) => s.toggleChecklistItem);
  const getSettings = useSettingsStore((s) => s.getSettings);

  const openToday = useMemo(() => {
    const end = endOfToday();
    return reminders
      .filter((r) => !r.is_done && r.due_at <= end)
      .sort((a, b) => a.due_at - b.due_at);
  }, [reminders]);

  const hero =
    openToday.find((r) => r.id === highlightId) ?? openToday[0] ?? null;
  const rest = openToday.filter((r) => r.id !== hero?.id);
  const showRest = scale.showFullLater || laterOpen;

  useFocusEffect(
    useCallback(() => {
      if (!useYaadItemStore.getState().ready) return;
      useYaadItemStore.getState().refresh();
    }, []),
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ContentColumn>
          <View style={[styles.header, { paddingHorizontal: gutter }]}>
            <Text style={[styles.brand, { color: colors.text }]}>Yaad</Text>
            <MemoryNodeIcon size={34} />
            <StreakBadge count={streak} />
          </View>

          {!storeReady || (bootstrapping && reminders.length === 0) ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <ScrollView
              style={styles.listFlex}
              contentContainerStyle={{
                paddingHorizontal: gutter,
                paddingBottom: spacing.lg,
                gap: scale.gap,
              }}
            >
              {hero ? (
                <HeroReminderCard
                  reminder={hero}
                  onDone={() =>
                    completeReminder(hero.id, getSettings())
                  }
                  onToggleItem={(index) =>
                    toggleChecklistItem(hero.id, index)
                  }
                  onPress={() => router.push(`/reminder/${hero.id}`)}
                />
              ) : (
                <View style={{ paddingTop: spacing.xxl }}>
                  <Text
                    style={{
                      fontSize: scale.heroTitle,
                      fontWeight: '700',
                      color: colors.text,
                      marginBottom: spacing.sm,
                    }}
                  >
                    {copy.emptyTodayTitle}
                  </Text>
                  <Text
                    style={{
                      fontSize: scale.body,
                      lineHeight: 22,
                      color: colors.textMuted,
                    }}
                  >
                    {copy.emptyTodayBody}
                  </Text>
                </View>
              )}

              {rest.length > 0 && !showRest ? (
                <Pressable
                  onPress={() => setLaterOpen(true)}
                  style={{
                    minHeight: scale.minHitTarget,
                    borderRadius: scale.radius,
                    backgroundColor: colors.surface,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.borderHairline,
                    paddingHorizontal: scale.cardPad,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: scale.body }}>
                    {copy.moreToday(rest.length)} → {copy.view}
                  </Text>
                </Pressable>
              ) : null}

              {rest.length > 0 && showRest
                ? rest.map((item) => (
                    <ReminderCard
                      key={item.id}
                      reminder={item}
                      highlighted={item.id === highlightId}
                      onPress={() => router.push(`/reminder/${item.id}`)}
                      onToggleItem={(index) =>
                        toggleChecklistItem(item.id, index)
                      }
                    />
                  ))
                : null}

              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderRadius: scale.radius,
                  overflow: 'hidden',
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.borderHairline,
                  minHeight: scale.minHitTarget,
                }}
                onPress={() => router.push('/add')}
              >
                <View
                  style={{
                    width: 4,
                    alignSelf: 'stretch',
                    backgroundColor: colors.accent,
                  }}
                />
                <Text
                  style={{
                    flex: 1,
                    paddingVertical: spacing.lg,
                    paddingHorizontal: spacing.lg,
                    fontSize: scale.body,
                    color: colors.textMuted,
                    fontWeight: '500',
                  }}
                >
                  {copy.addTask}
                </Text>
              </Pressable>
            </ScrollView>
          )}

          <CaptureBar
            gutter={gutter}
            onSubmitText={(text) =>
              router.push({ pathname: '/add', params: { draft: text } })
            }
          />
          <AdBanner />
        </ContentColumn>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  brand: {
    fontWeight: '700',
    fontSize: 22,
    letterSpacing: 0.3,
    minWidth: 72,
  },
  listFlex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
