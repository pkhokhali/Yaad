import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/dashboard/AppHeader';
import { EmptyPanel } from '@/components/dashboard/EmptyPanel';
import { FilterPills } from '@/components/dashboard/FilterPills';
import { PrimaryButton } from '@/components/dashboard/PrimaryButton';
import { AdBanner } from '@/components/AdBanner';
import { ContentColumn } from '@/components/ContentColumn';
import { ReminderCard } from '@/components/ReminderCard';
import { spacing } from '@/constants/theme';
import { endOfWeek, startOfWeek } from '@/lib/dashboard/dates';
import { done, overdue, tasks } from '@/lib/dashboard/reminders';
import { useResponsive } from '@/hooks/useResponsive';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useYaadItemStore } from '@/store/useYaadItemStore';

type ReminderFilter = 'open' | 'week' | 'overdue' | 'done';

const FILTERS: { value: ReminderFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'week', label: 'This week' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'done', label: 'Done' },
];

export default function RemindersScreen() {
  const router = useRouter();
  const { gutter } = useResponsive();
  const { colors } = useTheme();
  const { scale } = useScale();
  const [filter, setFilter] = useState<ReminderFilter>('open');
  const reminders = useYaadItemStore((s) => s.reminders);
  const toggleChecklistItem = useYaadItemStore((s) => s.toggleChecklistItem);

  useFocusEffect(
    useCallback(() => {
      if (useYaadItemStore.getState().ready) {
        useYaadItemStore.getState().refresh();
      }
    }, []),
  );

  const data = useMemo(() => {
    const base = tasks(reminders);
    let list = base;
    if (filter === 'week') {
      list = base.filter(
        (r) =>
          r.due_at >= startOfWeek().getTime() &&
          r.due_at <= endOfWeek().getTime(),
      );
    } else if (filter === 'overdue') {
      list = overdue(base);
    } else if (filter === 'done') {
      list = done(reminders).filter(
        (r) => r.category !== 'general' || Boolean(r.repeat_rule),
      );
    }
    return list.sort((a, b) => a.due_at - b.due_at);
  }, [reminders, filter]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ContentColumn>
        <View style={{ paddingHorizontal: gutter }}>
          <AppHeader />
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Reminders</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Medicine, calls, and scheduled alerts
              </Text>
            </View>
            <PrimaryButton
              label="+ New reminder"
              onPress={() =>
                router.push({ pathname: '/add', params: { mode: 'reminder' } })
              }
            />
          </View>
          <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
        </View>

        <FlatList
          style={{ flex: 1 }}
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingBottom: spacing.lg,
            gap: scale.gap,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <EmptyPanel
              title="No reminders yet"
              body="Add medicine, appointments, or daily reminders here."
            />
          }
          renderItem={({ item }) => (
            <ReminderCard
              reminder={item}
              onPress={() => router.push(`/reminder/${item.id}`)}
              onToggleItem={(index) => toggleChecklistItem(item.id, index)}
            />
          )}
        />
        <AdBanner />
      </ContentColumn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
});
