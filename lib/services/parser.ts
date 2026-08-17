import * as chrono from 'chrono-node';

import { formatActionTitle, normalizeReminderTitle } from '@/lib/services/actionCopy';
import { suggestCategory, suggestsDailyRepeat } from '@/lib/services/categorize';
import { listRecentReminders } from '@/lib/db/reminders';
import { ParsedCapture, Reminder } from '@/types';
import { splitListItems, toChecklistItems } from '@/lib/parse/listItems';

const PREFIX =
  /^(remind me to|remind me|remember to|don't forget to|dont forget to|need to|yaad|याद|मलाई सम्झाउ|मलाई याद गर|सम्झाउ|सम्झनु|नबिर्स|न बिर्स|लुमंके|लुमनं|malai samjhau|samjhau|yaad gar)\s+/iu;

const WORD_NUMBERS: Record<string, number> = {
  एक: 1,
  दुई: 2,
  दुइ: 2,
  तीन: 3,
  चार: 4,
  पाँच: 5,
  पांच: 5,
  छ: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दश: 10,
  दस: 10,
  एघार: 11,
  बाह्र: 12,
  तेह्र: 13,
  चौध: 14,
  पन्ध्र: 15,
  सोह्र: 16,
  सत्र: 17,
  अठार: 18,
  उन्नाइस: 19,
  बीस: 20,
};

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

const ENGLISH_HOUR_WORDS =
  'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve';

const ENGLISH_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`,
    'iu',
  ).test(text);
}

function parseNumeralToken(raw: string): number | null {
  const t = raw.trim();
  if (WORD_NUMBERS[t] != null) return WORD_NUMBERS[t];
  const en = ENGLISH_NUMBERS[t.toLowerCase()];
  if (en != null) return en;
  let western = '';
  for (const ch of t) {
    const i = DEVANAGARI_DIGITS.indexOf(ch);
    western += i >= 0 ? String(i) : ch;
  }
  if (/^\d+$/.test(western)) return parseInt(western, 10);
  return null;
}

type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

function detectDayPart(text: string): DayPart | null {
  if (
    hasWord(text, 'बिहान') ||
    hasWord(text, 'bihana') ||
    hasWord(text, 'भलनी') ||
    hasWord(text, 'morning')
  ) {
    return 'morning';
  }
  if (
    hasWord(text, 'दिउँसो') ||
    hasWord(text, 'दिउसो') ||
    hasWord(text, 'diuso') ||
    hasWord(text, 'afternoon')
  ) {
    return 'afternoon';
  }
  if (
    hasWord(text, 'बेलुका') ||
    hasWord(text, 'beluka') ||
    hasWord(text, 'साँझ') ||
    hasWord(text, 'sanajh') ||
    hasWord(text, 'सन्झ्याः') ||
    hasWord(text, 'evening')
  ) {
    return 'evening';
  }
  if (
    hasWord(text, 'राति') ||
    hasWord(text, 'rati') ||
    hasWord(text, 'चाः') ||
    hasWord(text, 'tonight') ||
    hasWord(text, 'night')
  ) {
    return 'night';
  }
  return null;
}

function applyDayPart(hour: number, part: DayPart | null): number {
  if (hour >= 13) return hour;
  if (part === 'evening' && hour < 12) return hour + 12;
  if (part === 'night' && hour < 12 && hour !== 0) return hour + 12;
  if (part === 'afternoon' && hour > 0 && hour < 7) return hour + 12;
  if (part === 'morning' && hour === 12) return 12;
  if (part === 'night' && hour === 12) return 0;
  return hour;
}

function defaultHourForPart(part: DayPart): number {
  switch (part) {
    case 'morning':
      return 8;
    case 'afternoon':
      return 14;
    case 'evening':
      return 18;
    case 'night':
      return 21;
  }
}

function addDays(date: Date, days: number): void {
  date.setDate(date.getDate() + days);
}

/**
 * Nepali / Newari (and romanized) time phrases that chrono-node does not know.
 */
export function parseLocalDueAt(
  text: string,
  base = new Date(),
): { dueAt: Date; matched: boolean; hadClock: boolean } {
  const due = new Date(base);
  let matched = false;
  let hadClock = false;

  if (
    hasWord(text, 'भोलि') ||
    hasWord(text, 'bholi') ||
    hasWord(text, 'कन्हय्')
  ) {
    addDays(due, 1);
    matched = true;
  } else if (
    hasWord(text, 'पर्सि') ||
    hasWord(text, 'parsi') ||
    hasWord(text, 'पिन्हय्')
  ) {
    addDays(due, 2);
    matched = true;
  } else if (
    hasWord(text, 'आज') ||
    hasWord(text, 'aaja') ||
    hasWord(text, 'aja') ||
    hasWord(text, 'थौं')
  ) {
    matched = true;
  }

  const clockText = text.replace(
    /\bfor\s+(?:o['']?\s*clock|oclock)\b/gi,
    "4 o'clock",
  );

  const durationMin = text.match(
    /(?:(?:after|in|pachhi|pachi|ma)\s+)?(\d+|[०-९]+|एक|दुई|दुइ|तीन|चार|पाँच|पांच|छ|सात|आठ|नौ|दश|दस|एघार|बाह्र|two|three|four|five)\s*(?:मिनेट|min(?:ute)?s?)\s*(?:मा|ma|pachhi|pachi|पछि)?/iu,
  );
  const durationHour = text.match(
    /(\d+|[०-९]+|एक|दुई|दुइ|तीन|चार|पाँच|पांच|छ|सात|आठ|नौ|दश|दस|एघार|बाह्र)\s*(घण्टा|ghanta|hours?)\s*(मा)?/iu,
  );
  const durationDay = text.match(
    /(\d+|[०-९]+|एक|दुई|दुइ|तीन|चार|पाँच|पांच|छ|सात|आठ|नौ|दश|दस)\s*(दिन|din|दिं)\s*(मा|पछि)?/iu,
  );

  if (durationMin) {
    const n = parseNumeralToken(durationMin[1]);
    if (n != null) {
      due.setMinutes(due.getMinutes() + n);
      matched = true;
      hadClock = true;
    }
  } else if (durationHour) {
    const n = parseNumeralToken(durationHour[1]);
    if (n != null) {
      due.setHours(due.getHours() + n);
      matched = true;
      hadClock = true;
    }
  } else if (durationDay) {
    const n = parseNumeralToken(durationDay[1]);
    if (n != null) {
      addDays(due, n);
      matched = true;
    }
  }

  const clock = clockText.match(
    new RegExp(
      `(\\d{1,2}|[०-९]{1,2}|${ENGLISH_HOUR_WORDS}|एक|दुई|दुइ|तीन|चार|पाँच|पांच|छ|सात|आठ|नौ|दश|दस|एघार|बाह्र)\\s*(?:[:.](\\d{2}|[०-९]{2}))?\\s*(?:बजे|baje|o['']?\\s*clock|oclock)`,
      'iu',
    ),
  );
  const dayPart = detectDayPart(text);

  if (clock) {
    let hour = parseNumeralToken(clock[1]);
    const minute = clock[2] ? parseNumeralToken(clock[2]) ?? 0 : 0;
    if (hour != null && hour >= 0 && hour <= 23) {
      hour = applyDayPart(hour, dayPart);
      due.setHours(hour, minute, 0, 0);
      matched = true;
      hadClock = true;
    }
  } else if (dayPart && !durationMin && !durationHour) {
    due.setHours(defaultHourForPart(dayPart), 0, 0, 0);
    matched = true;
    hadClock = true;
  }

  if (matched && due.getTime() <= base.getTime() - 30_000) {
    addDays(due, 1);
  }

  return { dueAt: due, matched, hadClock };
}

function stripLocalPhrases(title: string): string {
  return title.replace(
    /(?:आज|भोलि|पर्सि|बिहान|दिउँसो|दिउसो|बेलुका|साँझ|राति|थौं|कन्हय्|पिन्हय्|भलनी|सन्झ्याः|चाः|aaja|aja|bholi|parsi|bihana|beluka|rati|diuso|\d+[०-९]*\s*(?:बजे|baje|मिनेट(?:मा)?|घण्टा(?:मा)?|दिन(?:मा)?|min(?:ute)?s?|hours?|din)|[०-९]+\s*(?:बजे|मिनेट(?:मा)?|घण्टा(?:मा)?|दिन(?:मा)?)|(?:एक|दुई|दुइ|तीन|चार|पाँच|पांच|छ|सात|आठ|नौ|दश|दस|एघार|बाह्र)\s*(?:बजे|मिनेट(?:मा)?|घण्टा(?:मा)?))/giu,
    '',
  );
}

function stripClockPhrases(title: string): string {
  return title
    .replace(
      new RegExp(
        `\\b(at\\s+)?(?:\\d{1,2}(?::\\d{2})?|${ENGLISH_HOUR_WORDS})\\s*(?:o['']?\\s*clock|oclock)\\b`,
        'gi',
      ),
      '',
    )
    .replace(/\b(?:o['']?\s*clock|oclock)\b/gi, '')
    .replace(/\b(?:at\s+)?(?:for|four)\s+(?:o['']?\s*clock|oclock)\b/gi, '')
    .replace(/\bremaining\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanTitle(text: string, dueAt: Date): string {
  let title = normalizeReminderTitle(text.replace(PREFIX, '').trim());

  title = stripClockPhrases(title);
  title = stripLocalPhrases(
    title.replace(
      /\b(today|tomorrow|tonight|this (morning|afternoon|evening|week)|next (week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|at \d{1,2}(:\d{2})?\s*(am|pm|o['']?\s*clock|oclock)?|(?:after|in)\s+\d+\s*(minutes?|hours?|days?|mins?)|on \w+day)\b/gi,
      '',
    ),
  )
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim();

  if (!title) {
    title = normalizeReminderTitle(text.replace(PREFIX, '').trim()) || 'Reminder';
  }

  void dueAt;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function defaultDueAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

function scoreOverlap(a: string, b: string): number {
  const tokensA = new Set(
    a
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2),
  );
  const tokensB = b
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
  if (tokensA.size === 0 || tokensB.length === 0) return 0;
  let hits = 0;
  for (const t of tokensB) {
    if (tokensA.has(t)) hits += 1;
  }
  return hits / Math.max(tokensA.size, 1);
}

/** Lightweight on-device reference resolution against recent history. */
export async function resolveReference(
  text: string,
): Promise<Reminder | null> {
  const ref =
    /\b(the .+? thing|that .+|the same .+|again)\b/i.exec(text)?.[0] ??
    null;
  if (
    !ref &&
    !/\bagain\b/i.test(text) &&
    !hasWord(text, 'फेरि') &&
    !hasWord(text, 'लिसे')
  ) {
    return null;
  }

  const recent = await listRecentReminders(40);
  let best: Reminder | null = null;
  let bestScore = 0.25;

  for (const r of recent) {
    const score = scoreOverlap(r.title, text);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

export async function parseCaptureText(
  rawText: string,
): Promise<ParsedCapture> {
  const text = rawText.trim();
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  const chronoDate = results[0]?.start?.date();
  const local = parseLocalDueAt(text);

  let dueAt: Date;
  if (local.matched) {
    dueAt = local.dueAt;
    if (
      !local.hadClock &&
      chronoDate &&
      results[0]?.start?.isCertain('hour')
    ) {
      dueAt.setHours(chronoDate.getHours(), chronoDate.getMinutes(), 0, 0);
    }
  } else {
    dueAt = chronoDate ?? defaultDueAt();
  }

  let title = cleanTitle(text, dueAt);
  const referenced = await resolveReference(text);
  if (
    referenced &&
    (/\b(again|same|that|the .+ thing)\b/i.test(text) ||
      hasWord(text, 'फेरि') ||
      hasWord(text, 'लिसे'))
  ) {
    title = referenced.title;
  }

  const category = suggestCategory(text) || referenced?.category || 'general';
  const repeatDaily = suggestsDailyRepeat(text, category);
  const items = toChecklistItems(splitListItems(text));

  return {
    title: formatActionTitle(title, category),
    dueAt,
    category,
    rawText: text,
    repeatDaily,
    items,
    confident:
      title.trim().length >= 3 &&
      title.trim().toLowerCase() !== 'reminder' &&
      (local.matched || Boolean(chronoDate) || repeatDaily || Boolean(items?.length)),
  };
}
