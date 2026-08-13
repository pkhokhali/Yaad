import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/AdBanner';
import { CaptureBar } from '@/components/CaptureBar';
import { ReminderCard } from '@/components/ReminderCard';
import { StreakBadge } from '@/components/StreakBadge';
import { colors, spacing } from '@/constants/theme';
import { useReminderStore } from '@/store/useReminderStore';

export default function HomeScreen() {
  const router = useRouter();
  const reminders = useReminderStore((s) => s.reminders);
  const streak = useReminderStore((s) => s.streak);
  const highlightId = useReminderStore((s) => s.highlightId);
  const loading = useReminderStore((s) => s.loading);
  const refresh = useReminderStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const open = reminders.filter((r) => !r.is_done);
  const done = reminders.filter((r) => r.is_done);

  const onCapture = (text: string) => {
    router.push({ pathname: '/add', params: { draft: text } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>याद</Text>
          <Text style={styles.subtitle}>Today</Text>
        </View>
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing due today</Text>
              <Text style={styles.emptyBody}>
                Capture a reminder below — Yaad will interrupt you at the right
                moment.
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
            done.length > 0 ? (
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
            ) : null
          }
        />
      )}

      <AdBanner />
      <CaptureBar onSubmitText={onCapture} />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  brand: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 15,
    color: colors.textMuted,
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
