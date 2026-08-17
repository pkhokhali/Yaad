import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { ChecklistRows } from '@/components/ChecklistRows';
import { categoryColors } from '@/constants/theme';
import { useCopy } from '@/lib/i18n/copy';
import { CATEGORY_LABEL, normalizeCategory } from '@/lib/care/categories';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Reminder } from '@/types';

type Props = {
  reminder: Reminder;
  onDone: () => void;
  onToggleItem: (index: number) => void;
  onPress?: () => void;
};

function formatDue(ms: number, overdueLabel: string): { text: string; overdue: boolean } {
  const due = new Date(ms);
  const time = due.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  const overdue = ms < Date.now();
  if (overdue) {
    const day = due.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return { text: `${overdueLabel} · ${day} ${time}`, overdue: true };
  }
  return { text: time, overdue: false };
}

export function HeroReminderCard({
  reminder,
  onDone,
  onToggleItem,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { scale } = useScale();
  const copy = useCopy();
  const category = normalizeCategory(reminder.category);
  const palette = categoryColors[category] ?? categoryColors.general;
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
          borderColor: due.overdue ? colors.danger : colors.borderHairline,
          borderRadius: scale.radius,
          padding: scale.cardPad,
          gap: scale.gap,
        },
      ]}
    >
      <Pressable onPress={onPress} disabled={!onPress}>
        <View style={styles.top}>
          <Text
            style={{
              fontSize: scale.heroLabel,
              fontWeight: '700',
              color: palette.tint,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {CATEGORY_LABEL[category]}
          </Text>
          {items.length > 0 ? (
            <Text style={{ fontSize: scale.heroLabel, color: colors.textMuted }}>
              {copy.itemsDone(doneCount, items.length)}
            </Text>
          ) : null}
        </View>

        <View style={[styles.row, { gap: scale.gap, marginTop: scale.gap }]}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={{
                width: scale.heroPhoto,
                height: scale.heroPhoto,
                borderRadius: 14,
                backgroundColor: colors.surfaceElevated,
              }}
            />
          ) : (
            <CategoryChip category={category} filled size={scale.heroPhoto} />
          )}
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text
              numberOfLines={2}
              style={{
                fontSize: scale.heroTitle,
                fontWeight: '700',
                color: colors.text,
              }}
            >
              {reminder.title}
            </Text>
            <View style={styles.dueRow}>
              {due.overdue ? (
                <Ionicons name="time-outline" size={16} color={colors.danger} />
              ) : null}
              <Text
                style={{
                  fontSize: scale.heroTime,
                  fontWeight: '700',
                  color: due.overdue ? colors.danger : colors.text,
                }}
              >
                {due.text}
                {reminder.repeat_rule === 'daily' ? ` · ${copy.dailyTasks}` : ''}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {items.length > 0 ? (
        <ChecklistRows
          items={items}
          onToggle={onToggleItem}
          onExtraPress={onPress}
        />
      ) : null}

      <Pressable
        onPress={onDone}
        style={{
          minHeight: scale.minHitTarget,
          paddingVertical: scale.heroBtnPad,
          borderRadius: 999,
          backgroundColor: colors.accent,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
        accessibilityRole="button"
        accessibilityLabel={copy.done}
      >
        <Ionicons name="checkmark" size={scale.heroBtn + 2} color="#1A1C21" />
        <Text
          style={{
            color: '#1A1C21',
            fontWeight: '800',
            fontSize: scale.heroBtn,
          }}
        >
          {copy.done}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
