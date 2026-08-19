import {
  endOfNepaliMonth,
  formatDisplayDate,
  formatDisplayDateShort,
  formatDisplayDateTime,
  formatDisplayDayHeader,
  formatMonthLabelForCalendar,
  startOfNepaliMonth,
} from '@/lib/calendar/nepali';
import { CalendarDisplay, UiLanguage } from '@/types';

export function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date = new Date()): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date = new Date()): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date = new Date()): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function endOfMonth(date = new Date()): Date {
  const d = startOfMonth(date);
  d.setMonth(d.getMonth() + 1);
  d.setMilliseconds(-1);
  return d;
}

export function monthRange(
  date = new Date(),
  calendar: CalendarDisplay = 'ad',
): { start: number; end: number } {
  if (calendar === 'bs' || calendar === 'both') {
    return {
      start: startOfNepaliMonth(date).getTime(),
      end: endOfNepaliMonth(date).getTime(),
    };
  }
  return {
    start: startOfMonth(date).getTime(),
    end: endOfMonth(date).getTime(),
  };
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatLongDate(
  date = new Date(),
  calendar: CalendarDisplay = 'ad',
  uiLanguage: UiLanguage = 'en',
): string {
  return formatDisplayDate(date, calendar, uiLanguage);
}

export function formatMonthLabel(
  date = new Date(),
  calendar: CalendarDisplay = 'ad',
  uiLanguage: UiLanguage = 'en',
): string {
  return formatMonthLabelForCalendar(date, calendar, uiLanguage);
}

export {
  formatDisplayDate,
  formatDisplayDateShort,
  formatDisplayDateTime,
  formatDisplayDayHeader,
};
