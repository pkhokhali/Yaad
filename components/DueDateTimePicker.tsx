import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PickerMode = 'date' | 'time';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  /** Applied to the date picker only (e.g. block past dates on new reminders). */
  minimumDate?: Date;
};

function mergeDatePart(base: Date, picked: Date): Date {
  const next = new Date(base);
  next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return next;
}

function mergeTimePart(base: Date, picked: Date): Date {
  const next = new Date(base);
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next;
}

function handlePickerEvent(
  event: DateTimePickerEvent,
  picked: Date | undefined,
  onPick: (date: Date) => void,
): boolean {
  if (event?.type === 'dismissed' || !picked) return false;
  onPick(picked);
  return true;
}

export function DueDateTimePicker({ value, onChange, minimumDate }: Props) {
  const { colors } = useTheme();
  const [active, setActive] = useState<PickerMode | null>(null);

  const closeOnAndroid = () => {
    if (Platform.OS === 'android') setActive(null);
  };

  const onDateChange = (event: DateTimePickerEvent, picked?: Date) => {
    const applied = handlePickerEvent(event, picked, (date) => {
      onChange(mergeDatePart(value, date));
    });
    if (applied && Platform.OS === 'android') {
      setActive('time');
      return;
    }
    closeOnAndroid();
  };

  const onTimeChange = (event: DateTimePickerEvent, picked?: Date) => {
    handlePickerEvent(event, picked, (date) => {
      onChange(mergeTimePart(value, date));
    });
    closeOnAndroid();
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.row, { borderColor: colors.borderHairline }]}
        onPress={() => setActive('date')}
        accessibilityRole="button"
        accessibilityLabel="Change date"
      >
        <Ionicons name="calendar-outline" size={18} color={colors.accent} />
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>Date</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {value.toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
      </Pressable>

      <Pressable
        style={[styles.row, { borderColor: colors.borderHairline }]}
        onPress={() => setActive('time')}
        accessibilityRole="button"
        accessibilityLabel="Change time"
      >
        <Ionicons name="time-outline" size={18} color={colors.accent} />
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>Time</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {value.toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
      </Pressable>

      {active === 'date' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          onChange={onDateChange}
        />
      ) : null}

      {active === 'time' ? (
        <DateTimePicker
          value={value}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  copy: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
});
