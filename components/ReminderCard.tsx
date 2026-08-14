import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { colors, radii, spacing } from '@/constants/theme';
import { Reminder } from '@/types';

type Props = {
  reminder: Reminder;
  highlighted?: boolean;
  onPress: () => void;
};

function formatDue(ms: number): string {
  const due = new Date(ms);
  const time = due.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due.getTime() < today.getTime()) {
    return `Overdue · ${due.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`;
  }
  return time;
}

export function ReminderCard({ reminder, highlighted = false, onPress }: Props) {
  const done = Boolean(reminder.is_done);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        highlighted && styles.highlighted,
        done && styles.done,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.stripe, highlighted && styles.stripeActive]} />
      <CategoryChip
        category={reminder.category}
        filled={highlighted && !done}
      />
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {reminder.title}
        </Text>
        <Text style={styles.meta}>
          {formatDue(reminder.due_at)}
          {reminder.repeat_rule ? ` · ${reminder.repeat_rule.replace('_', ' ')}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg,
    paddingLeft: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
    overflow: 'hidden',
  },
  stripe: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    opacity: 0.65,
    borderTopLeftRadius: radii.card,
    borderBottomLeftRadius: radii.card,
  },
  stripeActive: {
    opacity: 1,
  },
  highlighted: {
    borderColor: colors.accentGlow,
  },
  done: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
