import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { ChecklistRows } from '@/components/ChecklistRows';
import { useCopy } from '@/lib/i18n/copy';
import { CATEGORY_LABEL, normalizeCategory } from '@/lib/care/categories';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Reminder } from '@/types';

type Props = {
  reminder: Reminder;
  highlighted?: boolean;
  onPress: () => void;
  onToggleItem?: (index: number) => void;
};

function formatDue(ms: number, overdueLabel: string): { text: string; overdue: boolean } {
  const due = new Date(ms);
  const time = due.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  const overdue = ms < Date.now();
  if (overdue) {
    return {
      text: `${overdueLabel} · ${due.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })} ${time}`,
      overdue: true,
    };
  }
  return { text: time, overdue: false };
}

export function ReminderCard({
  reminder,
  highlighted = false,
  onPress,
  onToggleItem,
}: Props) {
  const { colors } = useTheme();
  const { scale } = useScale();
  const copy = useCopy();
  const done = Boolean(reminder.is_done);
  const category = normalizeCategory(reminder.category);
  const photo = reminder.image_uri;
  const due = formatDue(reminder.due_at, copy.overdue);
  const items = reminder.items ?? [];
  const doneCount = items.filter((item) => item.done).length;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: highlighted ? colors.accentGlow : colors.borderHairline,
          borderRadius: scale.radius,
          paddingVertical: scale.cardPad,
          paddingRight: scale.cardPad,
          minHeight: scale.minHitTarget,
          opacity: done ? 0.55 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.stripe,
          {
            backgroundColor: due.overdue ? colors.danger : colors.accent,
            opacity: highlighted ? 1 : 0.65,
            borderTopLeftRadius: scale.radius,
            borderBottomLeftRadius: scale.radius,
          },
        ]}
      />
      <View style={styles.body}>
        <Pressable onPress={onPress} style={styles.main}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={[
                styles.thumb,
                { backgroundColor: colors.surfaceElevated },
              ]}
            />
          ) : (
            <CategoryChip category={category} filled={highlighted && !done} />
          )}
          <View style={styles.copy}>
            <View style={styles.kindRow}>
              <Text style={[styles.kind, { color: colors.accent }]}>
                {CATEGORY_LABEL[category]}
              </Text>
              {items.length > 0 ? (
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  {copy.itemsDone(doneCount, items.length)}
                </Text>
              ) : null}
            </View>
            <Text
              style={[
                styles.title,
                {
                  color: done ? colors.textMuted : colors.text,
                  textDecorationLine: done ? 'line-through' : 'none',
                  fontSize: scale.body,
                },
              ]}
              numberOfLines={2}
            >
              {reminder.title}
            </Text>
            <View style={styles.metaRow}>
              {due.overdue ? (
                <Ionicons name="time-outline" size={14} color={colors.danger} />
              ) : null}
              <Text
                style={{
                  fontSize: scale.meta,
                  color: due.overdue ? colors.danger : colors.textMuted,
                }}
              >
                {due.text}
                {reminder.repeat_rule === 'daily' ? ` · ${copy.dailyTasks}` : ''}
              </Text>
            </View>
          </View>
        </Pressable>
        {items.length > 0 && onToggleItem && !done ? (
          <ChecklistRows
            items={items}
            onToggle={onToggleItem}
            onExtraPress={onPress}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minWidth: 0,
    paddingLeft: 0,
  },
  stripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  body: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    paddingRight: 2,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kind: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontWeight: '600',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
