import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentColumn } from '@/components/ContentColumn';
import { EmptyPanel } from '@/components/dashboard/EmptyPanel';
import { SurfaceCard } from '@/components/dashboard/SurfaceCard';
import { categoryColors, radii, spacing } from '@/constants/theme';
import { formatDueLabel, overdue } from '@/lib/dashboard/reminders';
import {
  listNotificationHistory,
  NotificationHistoryEntry,
} from '@/lib/db/notificationLog';
import { useResponsive } from '@/hooks/useResponsive';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useYaadItemStore } from '@/store/useYaadItemStore';
import { Category, Reminder } from '@/types';

function tierLabel(tier: string): string {
  if (tier === 'nudge') return 'Nudge';
  if (tier === 'alert') return 'Alert';
  if (tier.startsWith('pre')) return 'Early';
  if (tier.startsWith('post')) return 'Follow-up';
  if (tier.startsWith('daily')) return 'Daily';
  return 'Alert';
}

function formatWhen(ts: number | null): string {
  if (!ts) return 'Unknown time';
  return new Date(ts).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dayKey(ts: number | null): string {
  if (!ts) return 'Unknown';
  return new Date(ts).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

type Row =
  | { kind: 'section'; id: string; label: string }
  | { kind: 'overdue'; id: string; reminder: Reminder }
  | { kind: 'header'; id: string; label: string }
  | { kind: 'entry'; id: string; entry: NotificationHistoryEntry };

export default function HistoryScreen() {
  const router = useRouter();
  const { gutter } = useResponsive();
  const { colors } = useTheme();
  const { scale } = useScale();
  const reminders = useYaadItemStore((s) => s.reminders);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<NotificationHistoryEntry[]>([]);

  const overdueItems = useMemo(() => overdue(reminders), [reminders]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listNotificationHistory();
      setEntries(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      if (useYaadItemStore.getState().ready) {
        useYaadItemStore.getState().refresh();
      }
    }, [load]),
  );

  const rows = useMemo(() => {
    const out: Row[] = [];

    if (overdueItems.length > 0) {
      out.push({
        kind: 'section',
        id: 'section-overdue',
        label: `Needs attention (${overdueItems.length})`,
      });
      for (const reminder of overdueItems) {
        out.push({ kind: 'overdue', id: `overdue-${reminder.id}`, reminder });
      }
    }

    if (entries.length > 0) {
      out.push({
        kind: 'section',
        id: 'section-history',
        label: 'Past alerts',
      });
      let lastDay = '';
      for (const entry of entries) {
        const key = dayKey(entry.fired_at);
        if (key !== lastDay) {
          out.push({ kind: 'header', id: `h-${key}`, label: key });
          lastDay = key;
        }
        out.push({ kind: 'entry', id: entry.id, entry });
      }
    }

    return out;
  }, [entries, overdueItems]);

  const renderOverdue = (reminder: Reminder) => {
    const category = reminder.category as Category;
    const tint = categoryColors[category]?.tint ?? colors.danger;
    return (
      <Pressable onPress={() => router.push(`/reminder/${reminder.id}`)}>
        <SurfaceCard style={[styles.card, { borderColor: colors.danger, borderWidth: 1 }]}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: tint }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {reminder.title}
              </Text>
              <Text style={[styles.meta, { color: colors.danger }]}>
                Overdue · {formatDueLabel(reminder.due_at)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </View>
        </SurfaceCard>
      </Pressable>
    );
  };

  const renderEntry = (entry: NotificationHistoryEntry) => {
    const category = (entry.reminder_category ?? 'general') as Category;
    const tint = categoryColors[category]?.tint ?? colors.accent;
    const title = entry.reminder_title ?? 'Reminder deleted';
    return (
      <Pressable
        onPress={() => {
          if (entry.reminder_id) {
            router.push(`/reminder/${entry.reminder_id}`);
          }
        }}
        disabled={!entry.reminder_id}
      >
        <SurfaceCard style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: tint }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {title}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {formatWhen(entry.fired_at)} · {tierLabel(entry.tier)}
              </Text>
            </View>
            {entry.reminder_id ? (
              <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
            ) : null}
          </View>
        </SurfaceCard>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ContentColumn>
        <View style={{ paddingHorizontal: gutter, paddingTop: spacing.sm }}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: colors.text, fontSize: scale.heroTitle }]}>
            Notifications
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Overdue reminders and alerts Yaad has already fired.
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/reminders')}
            style={[styles.linkBtn, { borderColor: colors.borderHairline }]}
          >
            <Ionicons name="list-outline" size={16} color={colors.accent} />
            <Text style={[styles.linkText, { color: colors.accent }]}>All reminders</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: gutter,
              paddingBottom: spacing.xxxl,
              gap: scale.gap,
              flexGrow: 1,
            }}
            ListEmptyComponent={
              <EmptyPanel
                title="All clear"
                body="No overdue reminders and no fired alerts yet."
              />
            }
            renderItem={({ item }) => {
              if (item.kind === 'section') {
                return (
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {item.label}
                  </Text>
                );
              }
              if (item.kind === 'overdue') return renderOverdue(item.reminder);
              if (item.kind === 'header') {
                return (
                  <Text style={[styles.dayHeader, { color: colors.textSubtle }]}>
                    {item.label}
                  </Text>
                );
              }
              return renderEntry(item.entry);
            }}
          />
        )}
      </ContentColumn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backBtn: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  screenTitle: {
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkText: {
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  card: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    marginTop: 4,
  },
});
