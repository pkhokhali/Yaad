import NepaliDate, { dateConfigMap } from 'nepali-date-converter';

import { CalendarDisplay, UiLanguage } from '@/types';

const BS_MONTH_KEYS = [
  'Baisakh',
  'Jestha',
  'Asar',
  'Shrawan',
  'Bhadra',
  'Aswin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
] as const;

export const BS_MONTHS = BS_MONTH_KEYS.map((key, index) => ({
  index,
  key,
  en: key,
  np: [
    'बैशाख',
    'जेठ',
    'असार',
    'श्रावण',
    'भाद्र',
    'असोज',
    'कात्तिक',
    'मंसिर',
    'पौष',
    'माघ',
    'फागुन',
    'चैत',
  ][index],
}));

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

function toWesternDigits(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const i = DEVANAGARI_DIGITS.indexOf(ch);
    out += i >= 0 ? String(i) : ch;
  }
  return out;
}

export function adToBs(date: Date): { year: number; month: number; day: number } {
  const nd = NepaliDate.fromAD(date);
  return {
    year: nd.getYear(),
    month: nd.getMonth(),
    day: nd.getDate(),
  };
}

export function bsToAd(year: number, monthIndex: number, day: number): Date {
  return new NepaliDate(year, monthIndex, day).toJsDate();
}

export function daysInBsMonth(year: number, monthIndex: number): number {
  const key = BS_MONTH_KEYS[monthIndex];
  const yearConfig = dateConfigMap[String(year)];
  if (!yearConfig) {
    const probe = new NepaliDate(year, monthIndex, 1);
    probe.setDate(32);
    return probe.getDate();
  }
  return yearConfig[key];
}

export function startOfNepaliMonth(date = new Date()): Date {
  const bs = adToBs(date);
  const start = bsToAd(bs.year, bs.month, 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfNepaliMonth(date = new Date()): Date {
  const bs = adToBs(date);
  const lastDay = daysInBsMonth(bs.year, bs.month);
  const end = bsToAd(bs.year, bs.month, lastDay);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatAd(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAdShort(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatBs(date: Date, uiLanguage: UiLanguage): string {
  const nd = NepaliDate.fromAD(date);
  const lang = uiLanguage === 'ne' ? 'np' : 'en';
  return nd.format('ddd, DD MMMM YYYY', lang);
}

function formatBsShort(date: Date, uiLanguage: UiLanguage): string {
  const nd = NepaliDate.fromAD(date);
  const lang = uiLanguage === 'ne' ? 'np' : 'en';
  return nd.format('DD MMMM YYYY', lang);
}

function formatBsMonth(date: Date, uiLanguage: UiLanguage): string {
  const nd = NepaliDate.fromAD(date);
  const lang = uiLanguage === 'ne' ? 'np' : 'en';
  return nd.format('MMMM YYYY', lang);
}

export function formatDisplayDate(
  date: Date,
  mode: CalendarDisplay,
  uiLanguage: UiLanguage = 'en',
): string {
  if (mode === 'ad') return formatAd(date);
  if (mode === 'bs') return formatBs(date, uiLanguage);
  return `${formatAd(date)} · ${formatBs(date, uiLanguage)}`;
}

export function formatDisplayDateShort(
  date: Date,
  mode: CalendarDisplay,
  uiLanguage: UiLanguage = 'en',
): string {
  if (mode === 'ad') {
    return date.toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  if (mode === 'bs') return formatBsShort(date, uiLanguage);
  return `${date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  })} · ${formatBsShort(date, uiLanguage)}`;
}

export function formatDisplayDateTime(
  ts: number,
  mode: CalendarDisplay,
  uiLanguage: UiLanguage = 'en',
): string {
  const date = new Date(ts);
  const time = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatDisplayDateShort(date, mode, uiLanguage)} · ${time}`;
}

export function formatDisplayDayHeader(
  ts: number,
  mode: CalendarDisplay,
  uiLanguage: UiLanguage = 'en',
): string {
  const date = new Date(ts);
  if (mode === 'ad') {
    return date.toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }
  if (mode === 'bs') {
    const nd = NepaliDate.fromAD(date);
    const lang = uiLanguage === 'ne' ? 'np' : 'en';
    return nd.format('ddd, DD MMMM', lang);
  }
  const nd = NepaliDate.fromAD(date);
  const lang = uiLanguage === 'ne' ? 'np' : 'en';
  return `${date.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })} · ${nd.format('ddd, DD MMMM', lang)}`;
}

export function formatMonthLabelForCalendar(
  date = new Date(),
  mode: CalendarDisplay = 'ad',
  uiLanguage: UiLanguage = 'en',
): string {
  if (mode === 'ad') {
    return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }
  if (mode === 'bs') return formatBsMonth(date, uiLanguage);
  return `${date.toLocaleDateString([], { month: 'long', year: 'numeric' })} · ${formatBsMonth(date, uiLanguage)}`;
}

const MONTH_ALIASES: { index: number; pattern: RegExp }[] = BS_MONTHS.flatMap(
  (month) => {
    const roman = month.en.toLowerCase();
    const aliases: string[] = [roman];
    if (roman === 'asar') aliases.push('ashadh', 'ashad');
    if (roman === 'shrawan') aliases.push('sawan', 'saun');
    if (roman === 'aswin') aliases.push('asoj', 'ashwin');
    if (roman === 'falgun') aliases.push('phagun', 'fagun');
    if (roman === 'baisakh') aliases.push('baishakh');
    return [
      {
        index: month.index,
        pattern: new RegExp(
          `(?:${[month.np, ...aliases]
            .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|')})`,
          'iu',
        ),
      },
    ];
  },
);

function parseIntegerToken(raw: string | undefined): number | null {
  if (!raw) return null;
  const western = toWesternDigits(raw.trim());
  if (!/^\d+$/.test(western)) return null;
  const value = parseInt(western, 10);
  return Number.isFinite(value) ? value : null;
}

function findMonthIndex(text: string): number | null {
  for (const entry of MONTH_ALIASES) {
    if (entry.pattern.test(text)) return entry.index;
  }
  return null;
}

/**
 * Parse Bikram Sambat calendar phrases from voice/text.
 * Examples: "२०८२ फागुन ५", "2082 falgun 5", "falgun 15".
 */
export function parseBsDateFromText(text: string, base = new Date()): Date | null {
  const monthIndex = findMonthIndex(text);
  if (monthIndex == null) return null;

  const normalized = toWesternDigits(text.trim());
  const currentBs = adToBs(base);
  let year = currentBs.year;

  const yearMatch = normalized.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch) {
    const parsedYear = parseIntegerToken(yearMatch[1]);
    if (parsedYear != null) year = parsedYear;
  }

  const yearNumber = yearMatch ? parseIntegerToken(yearMatch[1]) : null;
  const dayMatches = [...normalized.matchAll(/\b(\d{1,2})\b/g)]
    .map((match) => parseIntegerToken(match[1]))
    .filter((value): value is number => value != null && value >= 1 && value <= 32);

  const day =
    dayMatches.find((value) => value !== yearNumber) ??
    (yearMatch ? null : currentBs.day);

  if (day == null) return null;

  const maxDay = daysInBsMonth(year, monthIndex);
  if (day < 1 || day > maxDay || year < 2000 || year > 2100) return null;

  try {
    const picked = bsToAd(year, monthIndex, day);
    picked.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), 0);
    return picked;
  } catch {
    return null;
  }
}

export function bsDateLabel(date: Date, uiLanguage: UiLanguage): string {
  return formatBsShort(date, uiLanguage);
}
