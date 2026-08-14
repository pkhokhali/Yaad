import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/AdBanner';
import { MemoryNodeFab } from '@/components/MemoryNodeFab';
import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { ReminderCard } from '@/components/ReminderCard';
import { StreakBadge } from '@/components/StreakBadge';
import { brand, colors, spacing } from '@/constants/theme';
import { useReminderStore } from '@/store/useReminderStore';

export default function HomeScreen() {
  const router = useRouter();
  const reminders = useReminderStore((s) => s.reminders);
  const streak = useReminderStore((s) => s.streak);
  const highlightId = useReminderStore((s) => s.highlightId);
  const loading = useReminderStore((s) => s.loading);
  const refresh = useReminderStore((s) => s.refresh);

  const open = reminders.filter((r) => !r.is_done);
  const done = reminders.filter((r) => r.is_done);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brand}>Yaad</Text>
        <MemoryNodeIcon size={34} />
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={12}
          accessibilityLabel="Settings"
        >
          <Ionicons name="ellipsis-vertical" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>ALWAYS IN YOUR POCKET</Text>
        <Text style={styles.heroSub}>{brand.tagline}</Text>
      </View>

      <View style={styles.tabs}>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>Main</Text>
        </View>
        <Pressable style={styles.tab} onPress={() => router.push('/settings')}>
          <Text style={styles.tabText}>Settings</Text>
        </Pressable>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <StreakBadge count={streak} />
      </View>

      {loading && reminders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={open}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={onRefresh}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing due today</Text>
              <Text style={styles.emptyBody}>
                Tap the Memory Node to speak a reminder — stored only on this
                device.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ReminderCard
              reminder={item}
              highlighted={item.id === highlightId}
              onPress={() => router.push(`/reminder/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListFooterComponent={
            <>
              <Pressable
                style={styles.addCard}
                onPress={() => router.push('/add')}
              >
                <View style={styles.addStripe} />
                <Text style={styles.addTitle}>Add new entry</Text>
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
              <View style={{ height: 88 }} />
            </>
          }
        />
      )}

      <AdBanner />
      <MemoryNodeFab />
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
    minWidth: 72,
  },
  hero: {
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
});
