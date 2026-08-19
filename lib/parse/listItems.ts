import { ChecklistItem } from '@/types';
import { splitShoppingItems } from '@/lib/voice/listCapture';

/**
 * Split a spoken/typed utterance into checklist rows when it is clearly a list.
 * Pure function — no UI, no I/O.
 */
export function splitListItems(raw: string): string[] | undefined {
  return splitShoppingItems(raw);
}

export function toChecklistItems(labels: string[] | undefined): ChecklistItem[] | undefined {
  if (!labels || labels.length < 2) return undefined;
  return labels.map((label) => ({ label, done: false }));
}
