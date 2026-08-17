import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/AdBanner';
import { CaptureBar } from '@/components/CaptureBar';
import { ContentColumn } from '@/components/ContentColumn';
import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { ReminderCard } from '@/components/ReminderCard';
import { StreakBadge } from '@/components/StreakBadge';
import { brand, colors, spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { filterByBucket } from '@/lib/utils/priority';
import { useYaadItemStore } from '@/store/useYaadItemStore';

export default function HomeScreen() {
  const router = useRouter();
  const { gutter, s } = useResponsive();
  const items = useYaadItemStore((s) => s.items);
  const reminders = useYaadItemStore((s) => s.reminders);
  const streak = useYaadItemStore((s) => s.streak);
  const highlightId = useYaadItemStore((s) => s.highlightId);
  const bootstrapping = useYaadItemStore((s) => s.bootstrapping);
  const isRefreshing = useYaadItemStore((s) => s.isRefreshing);
  const storeReady = useYaadItemStore((s) => s.ready);

  const todayItems = useMemo(
    () => filterByBucket(items, 'Today'),
    [items],
  );

  const open = todayItems
    .map((item) => reminders.find((r) => r.id === item.id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => {
      const dailyA = a.repeat_rule === 'daily' || a.repeat_rule === 'weekly' ? 0 : 1;
      const dailyB = b.repeat_rule === 'daily' || b.repeat_rule === 'weekly' ? 0 : 1;
      if (dailyA !== dailyB) return dailyA - dailyB;
      return a.due_at - b.due_at;
    });
  const done = reminders.filter((r) => r.is_done);

  const onRefresh = useCallback(() => {
    useYaadItemStore.getState().refresh();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!useYaadItemStore.getState().ready) return;
      useYaadItemStore.getState().refresh();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ContentColumn>
        <View style={[styles.header, { paddingHorizontal: gutter }]}>
          <Text style={[styles.brand, { fontSize: s(22) }]}>Yaad</Text>
          <MemoryNodeIcon size={s(34)} />
          <Pressable
            onPress={() => router.push('/profile')}
            hitSlop={12}
            accessibilityLabel="Settings"
          >
            <Ionicons
              name="ellipsis-vertical"
              size={s(22)}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        <View style={[styles.hero, { paddingHorizontal: gutter }]}>
          <Text style={styles.heroTitle}>ALWAYS IN YOUR POCKET</Text>
          <Text style={styles.heroSub}>{brand.tagline}</Text>
        </View>

        <View style={[styles.tabs, { paddingHorizontal: gutter }]}>
          <View style={styles.tabActive}>
            <Text style={styles.tabActiveText}>Main</Text>
          </View>
          <Pressable style={styles.tab} onPress={() => router.push('/(tabs)/settings')}>
            <Text style={styles.tabText}>Settings</Text>
          </Pressable>
        </View>

        <View style={[styles.sectionRow, { paddingHorizontal: gutter }]}>
            <Text style={[styles.sectionTitle, { fontSize: s(18) }]}>
              Today
            </Text>
          <StreakBadge count={streak} />
        </View>

        {!storeReady || (bootstrapping && reminders.length === 0) ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={open}
            keyExtractor={(item) => item.id}
            style={styles.listFlex}
            contentContainerStyle={[
              styles.list,
              {
                paddingHorizontal: gutter,
                paddingBottom: spacing.lg,
              },
            ]}
            onRefresh={onRefresh}
            refreshing={isRefreshing}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nothing due today</Text>
                <Text style={styles.emptyBody}>
                  Add medicine, a daily task, or a one-time reminder. A family
                  member can set these up on this phone — no account needed.
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const isDaily =
                item.repeat_rule === 'daily' || item.repeat_rule === 'weekly';
              const prev = open[index - 1];
              const prevDaily =
                prev != null &&
                (prev.repeat_rule === 'daily' || prev.repeat_rule === 'weekly');
              const showGroup =
                index === 0 || Boolean(prevDaily) !== isDaily;
              return (
                <View>
                  {showGroup ? (
                    <Text style={styles.groupLabel}>
                      {isDaily ? 'Daily tasks' : 'Once'}
                    </Text>
                  ) : null}
                  <ReminderCard
                    reminder={item}
                    highlighted={item.id === highlightId}
                    onPress={() => router.push(`/reminder/${item.id}`)}
                  />
                </View>
              );
            }}
            ItemSeparatorComponent={() => (
              <View style={{ height: spacing.sm }} />
            )}
            ListFooterComponent={
              <>
                <Pressable
                  style={styles.addCard}
                  onPress={() => router.push('/add')}
                >
                  <View style={styles.addStripe} />
                  <Text style={styles.addTitle}>Add a task</Text>
                </Pressable>
                {done.length > 0 ? (
                  <View style={styles.doneSection}>
                    <Text style={styles.doneLabel}>Done today</Text>
                    {done.map((item) => (
                      <View key={item.id} style={{ marginBottom: spacing.sm }}>
                        <ReminderCard
                          reminder={item}
                          onPress={() => router.push(`/reminder/${item.id}`)}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            }
          />
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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  brand: {
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
    minWidth: 72,
  },
  hero: {
    paddingBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  heroSub: {
    marginTop: 4,
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textSubtle,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderHairline,
    marginBottom: spacing.md,
  },
  tabActive: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabActiveText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  tab: {
    paddingBottom: spacing.sm,
  },
  tabText: {
    fontSize: 15,
    color: colors.textSubtle,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginTop: spacing.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
  },
  addStripe: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    opacity: 0.55,
  },
  addTitle: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '500',
  },
  doneSection: {
    marginTop: spacing.xxl,
  },
  doneLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
});
