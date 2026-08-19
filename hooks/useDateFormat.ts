import { useMemo } from 'react';

import {
  formatDisplayDate,
  formatDisplayDateShort,
  formatDisplayDateTime,
  formatDisplayDayHeader,
  formatMonthLabelForCalendar,
} from '@/lib/calendar/nepali';
import {
  formatLongDate,
  formatMonthLabel,
} from '@/lib/dashboard/dates';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CalendarDisplay, UiLanguage } from '@/types';

export function useDateFormat() {
  const calendarDisplay = useSettingsStore(
    (s) => s.calendarDisplay ?? 'both',
  );
  const uiLanguage = useSettingsStore((s) => s.uiLanguage ?? 'en');

  return useMemo(
    () => ({
      calendarDisplay,
      uiLanguage,
      formatDate: (date: Date = new Date()) =>
        formatDisplayDate(date, calendarDisplay, uiLanguage),
      formatDateShort: (date: Date) =>
        formatDisplayDateShort(date, calendarDisplay, uiLanguage),
      formatDateTime: (ts: number) =>
        formatDisplayDateTime(ts, calendarDisplay, uiLanguage),
      formatDayHeader: (ts: number) =>
        formatDisplayDayHeader(ts, calendarDisplay, uiLanguage),
      formatMonth: (date: Date = new Date()) =>
        formatMonthLabel(date, calendarDisplay, uiLanguage),
      formatLongDate: (date: Date = new Date()) =>
        formatLongDate(date, calendarDisplay, uiLanguage),
      formatMonthLabel: (date: Date = new Date()) =>
        formatMonthLabelForCalendar(date, calendarDisplay, uiLanguage),
    }),
    [calendarDisplay, uiLanguage],
  );
}

export type DateFormat = ReturnType<typeof useDateFormat>;

export function useCalendarDisplay(): CalendarDisplay {
  return useSettingsStore((s) => s.calendarDisplay ?? 'both');
}

export function useUiLanguage(): UiLanguage {
  return useSettingsStore((s) => s.uiLanguage ?? 'en');
}
