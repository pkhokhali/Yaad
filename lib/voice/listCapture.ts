import { Category } from '@/types';

const TIME_NOISE =
  /\b(at|@)\s*\d{1,2}(:\d{2})?\s*(am|pm)?\b|\b\d{1,2}(:\d{2})?\s*(am|pm|baje|बजे)\b|\b(?:in the )?(morning|afternoon|evening|night)\b|\bevery day\b|\bdaily\b|\bweekly\b|\btoday\b|\btomorrow\b|\btonight\b|\bहरेक दिन\b|\bरोज\b|\bआज\b|\bभोलि\b/giu;

const REMINDER_PREFIX =
  /^(?:remind me to|remind me|remember to|don't forget to|dont forget to|yaad gara|yaad gar|yaad|याद गर|याद|मलाई सम्झाउ|मलाई याद गर|सम्झाउ|सम्झनु|malai samjhau|malai yaad gara|samjhau)\s+/iu;

const BUY_LEAD =
  /^(?:i\s+)?(?:need to|have to|want to|gotta|got to|please\s+)?(?:buy|purchase|get|pick up|pickup|shop for|grab)\s+/iu;

const SHOPPING_SIGNAL =
  /\b(buy|purchase|get|pick up|pickup|shop for|groceries|grocery|shopping|kirana|kirana saman|saman|किन|किन्नु|किराना|सामान)\b/iu;

const LIST_SPLIT =
  /\s*(?:,|،|(?:\s+and\s+)|(?:\s*&\s*)|\+|\/|(?:\s+plus\s+)|र|तथा|अनि)\s*/iu;

function capitalizeWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function cleanItemLabel(part: string): string {
  return part
    .replace(REMINDER_PREFIX, '')
    .replace(BUY_LEAD, '')
    .replace(/^(?:the|a|an|some)\s+/iu, '')
    .replace(/[.?!]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** True when the utterance looks like a multi-item shopping run. */
export function looksLikeShoppingList(text: string): boolean {
  if (!SHOPPING_SIGNAL.test(text)) return false;
  return splitShoppingItems(text) != null;
}

/** Split "buy egg, shampoo, lotion, bread & rice" into checklist rows. */
export function splitShoppingItems(raw: string): string[] | undefined {
  let stripped = raw.replace(TIME_NOISE, ' ').trim();
  stripped = stripped.replace(REMINDER_PREFIX, '').trim();
  stripped = stripped.replace(BUY_LEAD, '').trim();
  if (!stripped) return undefined;

  const parts = stripped
    .split(LIST_SPLIT)
    .map(cleanItemLabel)
    .filter((part) => part.length >= 2);

  const unique = parts.filter((part, index, arr) => arr.indexOf(part) === index);
  if (unique.length < 2) return undefined;
  return unique;
}

/** Short reminder title for a shopping checklist. */
export function titleForShoppingList(items: string[]): string {
  if (items.length === 0) return 'Buy groceries';
  if (items.length === 1) return `Buy ${capitalizeWord(items[0])}`;
  if (items.length === 2) {
    return `Buy ${capitalizeWord(items[0])} & ${capitalizeWord(items[1])}`;
  }
  return `Buy ${capitalizeWord(items[0])}, ${capitalizeWord(items[1])} +${items.length - 2}`;
}

/** Prefer buy category when a spoken list is clearly groceries/shopping. */
export function categoryForUtterance(text: string, fallback: Category): Category {
  if (looksLikeShoppingList(text)) return 'buy';
  return fallback;
}
