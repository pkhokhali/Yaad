import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { NepaliDatePicker } from '@/components/NepaliDatePicker';
import { spacing } from '@/constants/theme';
import { bsDateLabel } from '@/lib/calendar/nepali';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTheme } from '@/providers/ThemeProvider';

type PickerMode = 'date' | 'time';
type DatePickerKind = 'ad' | 'bs';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
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
  const { calendarDisplay, uiLanguage, formatDateShort } = useDateFormat();
  const [active, setActive] = useState<PickerMode | null>(null);
  const [bsPickerOpen, setBsPickerOpen] = useState(false);
  const [datePickerKind, setDatePickerKind] = useState<DatePickerKind>(
    calendarDisplay === 'bs' ? 'bs' : 'ad',
  );

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

  const openDatePicker = () => {
    if (calendarDisplay === 'bs') {
      setBsPickerOpen(true);
      return;
    }
    if (calendarDisplay === 'both' && datePickerKind === 'bs') {
      setBsPickerOpen(true);
      return;
    }
    setActive('date');
  };

  const adLine = value.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const bsLine = bsDateLabel(value, uiLanguage);
  const primaryDate =
    calendarDisplay === 'bs'
      ? bsLine
      : calendarDisplay === 'ad'
        ? adLine
        : formatDateShort(value);

  return (
    <View style={styles.wrap}>
      {calendarDisplay === 'both' ? (
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setDatePickerKind('ad')}
            style={[
              styles.toggleChip,
              {
                borderColor:
                  datePickerKind === 'ad' ? colors.primaryButton : colors.borderHairline,
                backgroundColor:
                  datePickerKind === 'ad' ? colors.surfaceElevated : 'transparent',
              },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
              AD picker
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDatePickerKind('bs')}
            style={[
              styles.toggleChip,
              {
                borderColor:
                  datePickerKind === 'bs' ? colors.primaryButton : colors.borderHairline,
                backgroundColor:
                  datePickerKind === 'bs' ? colors.surfaceElevated : 'transparent',
              },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
              BS picker
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[styles.row, { borderColor: colors.borderHairline }]}
        onPress={openDatePicker}
        accessibilityRole="button"
        accessibilityLabel="Change date"
      >
        <Ionicons name="calendar-outline" size={18} color={colors.accent} />
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.textSubtle }]}>Date</Text>
          <Text style={[styles.value, { color: colors.text }]}>{primaryDate}</Text>
          {calendarDisplay === 'both' ? (
            <Text style={[styles.secondary, { color: colors.textMuted }]}>
              {adLine} · {bsLine}
            </Text>
          ) : null}
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

      {bsPickerOpen ? (
        <NepaliDatePicker
          visible
          value={value}
          minimumDate={minimumDate}
          onChange={onChange}
          onClose={() => setBsPickerOpen(false)}
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
  secondary: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  toggleChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
