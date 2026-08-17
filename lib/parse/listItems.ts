import { ChecklistItem } from '@/types';

const TIME_NOISE =
  /\b(at|@)\s*\d{1,2}(:\d{2})?\s*(am|pm)?\b|\b\d{1,2}(:\d{2})?\s*(am|pm|baje|बजे)\b|\bevery day\b|\bdaily\b|\bweekly\b|\bहरेक दिन\b|\bरोज\b/giu;

const PREFIX =
  /^(remind me to|remind me|remember to|don't forget to|dont forget to|need to|buy|purchase|get|याद|मलाई सम्झाउ|सम्झाउ|किन्|malai samjhau)\s+/iu;

/**
 * Split a spoken/typed utterance into checklist rows when it is clearly a list.
 * Pure function — no UI, no I/O.
 */
export function splitListItems(raw: string): string[] | undefined {
  const stripped = raw.replace(TIME_NOISE, ' ').replace(PREFIX, '').trim();
  if (!stripped) return undefined;

  const parts = stripped
    .split(/\s*(?:,|،|and|&|र|तथा|अनि)\s+/iu)
    .map((part) => part.replace(/[.?!]+$/g, '').trim())
    .filter((part) => part.length >= 2);

  const unique = parts.filter((part, i, arr) => arr.indexOf(part) === i);
  if (unique.length < 2) return undefined;
  return unique;
}

export function toChecklistItems(labels: string[] | undefined): ChecklistItem[] | undefined {
  if (!labels || labels.length < 2) return undefined;
  return labels.map((label) => ({ label, done: false }));
}
