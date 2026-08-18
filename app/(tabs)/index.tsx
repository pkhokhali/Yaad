import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/dashboard/AppHeader';
import { SurfaceCard } from '@/components/dashboard/SurfaceCard';
import { ContentColumn } from '@/components/ContentColumn';
import { spacing } from '@/constants/theme';
import {
  formatLongDate,
  greetingForHour,
} from '@/lib/dashboard/dates';
import {
  dueThisWeek,
  dueToday,
  nextReminder,
  overdue,
  tasks,
  todos,
} from '@/lib/dashboard/reminders';
import { formatRs } from '@/lib/db/money';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/providers/ThemeProvider';
import { useMoneyStore } from '@/store/useMoneyStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useYaadItemStore } from '@/store/useYaadItemStore';

export default function DashboardScreen() {
  const router = useRouter();
  const { gutter } = useResponsive();
  const { colors } = useTheme();
  const displayName = useSettingsStore((s) => s.displayName?.trim());
  const reminders = useYaadItemStore((s) => s.reminders);
  const month = useMoneyStore((s) => s.month);

  useFocusEffect(
    useCallback(() => {
      if (useYaadItemStore.getState().ready) {
        useYaadItemStore.getState().refresh();
      }
      if (useMoneyStore.getState().ready) {
        useMoneyStore.getState().refresh();
      }
    }, []),
  );

  const stats = useMemo(() => {
    const todayCount = dueToday(todos(reminders)).length;
    const lateCount = overdue(todos(reminders)).length;
    const weekTasks = dueThisWeek(tasks(reminders)).length;
    const weekTodos = dueThisWeek(todos(reminders)).length;
    const upcoming = nextReminder(reminders);
    const expenseTotal = month.expenseOffice + month.expensePersonal;
    return { todayCount, lateCount, weekTasks, weekTodos, upcoming, expenseTotal };
  }, [reminders, month]);

  const name = displayName || 'there';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ContentColumn>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingBottom: spacing.xxxl,
            gap: spacing.md,
          }}
        >
          <AppHeader subtitle="याद · on this phone only" />

          <SurfaceCard>
            <View style={styles.greetRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.greetLead, { color: colors.textMuted }]}>
                  {greetingForHour()}
                </Text>
                <Text style={[styles.greetName, { color: colors.text }]}>{name}</Text>
                <Text style={[styles.greetDate, { color: colors.textSubtle }]}>
                  {formatLongDate()}
                </Text>
              </View>
              <View style={[styles.weekBadge, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.weekLabel, { color: colors.primaryButton }]}>THIS WEEK</Text>
                <Text style={[styles.weekValue, { color: colors.text }]}>
                  {stats.weekTasks} reminders · {stats.weekTodos} to-do
                </Text>
              </View>
            </View>
          </SurfaceCard>

          <View style={styles.statRow}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.push('/(tabs)/todo')}
            >
              <SurfaceCard title="To-do today">
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {stats.todayCount}
                </Text>
                {stats.lateCount > 0 ? (
                  <Text style={[styles.statMeta, { color: colors.danger }]}>
                    · {stats.lateCount} late
                  </Text>
                ) : (
                  <Text style={[styles.statMeta, { color: colors.textSubtle }]}>
                    personal quick items
                  </Text>
                )}
              </SurfaceCard>
            </Pressable>

            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.push('/(tabs)/reminders')}
            >
              <SurfaceCard title="Reminders">
                {stats.upcoming ? (
                  <>
                    <Text
                      style={[styles.reminderTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {stats.upcoming.title}
                    </Text>
                    <Text style={[styles.statMeta, { color: colors.textMuted }]}>
                      {new Date(stats.upcoming.due_at).toLocaleString([], {
                        weekday: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.statMeta, { color: colors.textSubtle }]}>
                    Nothing coming up
                  </Text>
                )}
              </SurfaceCard>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/(tabs)/expense')}>
            <SurfaceCard
              title="This month's expense / lend"
              actionLabel="View all →"
              onAction={() => router.push('/(tabs)/expense')}
            >
              <Text style={[styles.moneyTotal, { color: colors.text }]}>
                {formatRs(stats.expenseTotal + month.lendTotal)}
              </Text>
              <Text style={[styles.statMeta, { color: colors.textMuted }]}>
                Expense {formatRs(stats.expenseTotal)} · Lend {formatRs(month.lendTotal)}
              </Text>
              <Text style={[styles.statMeta, { color: colors.textSubtle, marginTop: 4 }]}>
                Office {formatRs(month.expenseOffice)} · Personal{' '}
                {formatRs(month.expensePersonal)}
              </Text>
            </SurfaceCard>
          </Pressable>

          <View style={styles.quickRow}>
            <Pressable
              style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.borderHairline }]}
              onPress={() => router.push({ pathname: '/add', params: { mode: 'todo' } })}
            >
              <Text style={[styles.quickText, { color: colors.text }]}>+ To-do</Text>
            </Pressable>
            <Pressable
              style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.borderHairline }]}
              onPress={() => router.push({ pathname: '/add', params: { mode: 'reminder' } })}
            >
              <Text style={[styles.quickText, { color: colors.text }]}>+ Reminder</Text>
            </Pressable>
            <Pressable
              style={[styles.quickBtn, { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton }]}
              onPress={() => router.push({ pathname: '/money/add', params: { kind: 'expense' } })}
            >
              <Text style={[styles.quickText, { color: '#FFFFFF' }]}>+ Expense</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ContentColumn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  greetRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  greetLead: { fontSize: 14 },
  greetName: { fontSize: 28, fontWeight: '700', marginTop: 2 },
  greetDate: { fontSize: 13, marginTop: 4 },
  weekBadge: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 130,
  },
  weekLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  weekValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 16,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statNumber: {
    fontSize: 34,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  statMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  moneyTotal: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
