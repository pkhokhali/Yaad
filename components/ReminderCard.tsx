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
  return new Date(ms).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
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
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
  },
  highlighted: {
    borderWidth: 2,
    borderColor: colors.accent,
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
