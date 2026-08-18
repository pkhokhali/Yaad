import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaptureBar } from '@/components/CaptureBar';
import { AppHeader } from '@/components/dashboard/AppHeader';
import { EmptyPanel } from '@/components/dashboard/EmptyPanel';
import { FilterPills } from '@/components/dashboard/FilterPills';
import { PrimaryButton } from '@/components/dashboard/PrimaryButton';
import { ContentColumn } from '@/components/ContentColumn';
import { ReminderCard } from '@/components/ReminderCard';
import { spacing } from '@/constants/theme';
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from '@/lib/dashboard/dates';
import { done, overdue, todos } from '@/lib/dashboard/reminders';
import { useResponsive } from '@/hooks/useResponsive';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useYaadItemStore } from '@/store/useYaadItemStore';
import { Reminder } from '@/types';

type TodoFilter = 'today' | 'week' | 'overdue' | 'done' | 'all';

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All' },
];

function filterTodos(list: Reminder[], filter: TodoFilter): Reminder[] {
  const base = todos(list);
  switch (filter) {
    case 'today':
      return base.filter(
        (r) =>
          r.due_at >= startOfDay().getTime() &&
          r.due_at <= endOfDay().getTime(),
      );
    case 'week':
      return base.filter(
        (r) =>
          r.due_at >= startOfWeek().getTime() &&
          r.due_at <= endOfWeek().getTime(),
      );
    case 'overdue':
      return overdue(base);
    case 'done':
      return done(list).filter(isTodoDoneCandidate);
    case 'all':
    default:
      return base;
  }
}

function isTodoDoneCandidate(r: Reminder): boolean {
  return r.category === 'general' && !r.repeat_rule;
}

export default function TodoScreen() {
  const router = useRouter();
  const { gutter } = useResponsive();
  const { colors } = useTheme();
  const { scale } = useScale();
  const [filter, setFilter] = useState<TodoFilter>('today');
  const reminders = useYaadItemStore((s) => s.reminders);
  const toggleChecklistItem = useYaadItemStore((s) => s.toggleChecklistItem);

  useFocusEffect(
    useCallback(() => {
      if (useYaadItemStore.getState().ready) {
        useYaadItemStore.getState().refresh();
      }
    }, []),
  );

  const data = useMemo(
    () =>
      filterTodos(reminders, filter).sort((a, b) => a.due_at - b.due_at),
    [reminders, filter],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ContentColumn>
        <View style={{ paddingHorizontal: gutter }}>
          <AppHeader />
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>To-Do</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Your personal task list
              </Text>
            </View>
            <PrimaryButton
              label="+ Add to-do"
              onPress={() => router.push({ pathname: '/add', params: { mode: 'todo' } })}
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
              title="Nothing here"
              body="Add a to-do to get started."
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

        <CaptureBar
          gutter={gutter}
          onSubmitText={(text) =>
            router.push({ pathname: '/add', params: { draft: text, mode: 'todo' } })
          }
        />
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
