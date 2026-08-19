import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { spacing } from '@/constants/theme';
import {
  BS_MONTHS,
  adToBs,
  bsToAd,
  daysInBsMonth,
} from '@/lib/calendar/nepali';
import { useUiLanguage } from '@/hooks/useDateFormat';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
};

export function NepaliDatePicker({
  visible,
  value,
  onChange,
  onClose,
  minimumDate,
}: Props) {
  const { colors } = useTheme();
  const uiLanguage = useUiLanguage();
  const initial = adToBs(value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  useEffect(() => {
    if (!visible) return;
    const next = adToBs(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [value, visible]);

  const minBs = minimumDate ? adToBs(minimumDate) : null;
  const days = daysInBsMonth(year, month);
  const monthLabel = uiLanguage === 'ne' ? BS_MONTHS[month].np : BS_MONTHS[month].en;

  const dayCells = useMemo(() => {
    return Array.from({ length: days }, (_, index) => index + 1);
  }, [days]);

  const isDisabled = (candidateDay: number): boolean => {
    if (!minBs) return false;
    if (year < minBs.year) return true;
    if (year > minBs.year) return false;
    if (month < minBs.month) return true;
    if (month > minBs.month) return false;
    return candidateDay < minBs.day;
  };

  const pickDay = (candidateDay: number) => {
    if (isDisabled(candidateDay)) return;
    setDay(candidateDay);
    const next = bsToAd(year, month, candidateDay);
    if (minimumDate && next < minimumDate) return;
    onChange(next);
    onClose();
  };

  const shiftYear = (delta: number) => {
    const nextYear = year + delta;
    if (nextYear < 2000 || nextYear > 2100) return;
    setYear(nextYear);
    const max = daysInBsMonth(nextYear, month);
    if (day > max) setDay(max);
  };

  const shiftMonth = (delta: number) => {
    let nextMonth = month + delta;
    let nextYear = year;
    while (nextMonth < 0) {
      nextMonth += 12;
      nextYear -= 1;
    }
    while (nextMonth > 11) {
      nextMonth -= 12;
      nextYear += 1;
    }
    if (nextYear < 2000 || nextYear > 2100) return;
    setYear(nextYear);
    setMonth(nextMonth);
    const max = daysInBsMonth(nextYear, nextMonth);
    if (day > max) setDay(max);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {uiLanguage === 'ne' ? 'नेपाली मिति' : 'Nepali date'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.yearRow}>
            <Pressable onPress={() => shiftYear(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={[styles.yearText, { color: colors.text }]}>{year}</Text>
            <Pressable onPress={() => shiftYear(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.monthRow}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            </Pressable>
            <Text style={[styles.monthText, { color: colors.text }]}>{monthLabel}</Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthStrip}>
            {BS_MONTHS.map((entry) => {
              const active = entry.index === month;
              return (
                <Pressable
                  key={entry.key}
                  onPress={() => {
                    setMonth(entry.index);
                    const max = daysInBsMonth(year, entry.index);
                    if (day > max) setDay(max);
                  }}
                  style={[
                    styles.monthChip,
                    {
                      borderColor: active ? colors.primaryButton : colors.borderHairline,
                      backgroundColor: active ? colors.surfaceElevated : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.text : colors.textMuted,
                      fontWeight: active ? '700' : '500',
                      fontSize: 12,
                    }}
                  >
                    {uiLanguage === 'ne' ? entry.np : entry.en}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.grid}>
            {dayCells.map((candidateDay) => {
              const active = candidateDay === day;
              const disabled = isDisabled(candidateDay);
              return (
                <Pressable
                  key={candidateDay}
                  onPress={() => pickDay(candidateDay)}
                  disabled={disabled}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: active ? colors.primaryButton : 'transparent',
                      opacity: disabled ? 0.35 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : colors.text,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {candidateDay}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  yearText: {
    fontSize: 24,
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'center',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 120,
    textAlign: 'center',
  },
  monthStrip: {
    maxHeight: 44,
  },
  monthChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dayCell: {
    width: '13%',
    minWidth: 36,
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
