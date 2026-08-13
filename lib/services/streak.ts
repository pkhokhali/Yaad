import { getMeta, setMeta } from '@/lib/db/database';

const STREAK_KEY = 'streak_count';
const LAST_ACTIVE_KEY = 'streak_last_active';

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Call when the user completes or creates a reminder — quiet positive signal. */
export async function recordActivity(): Promise<number> {
  const today = dayKey();
  const last = await getMeta(LAST_ACTIVE_KEY);
  const current = Number((await getMeta(STREAK_KEY)) ?? '0');

  if (last === today) return current;

  let next = 1;
  if (last === yesterdayKey()) {
    next = current + 1;
  }

  await setMeta(STREAK_KEY, String(next));
  await setMeta(LAST_ACTIVE_KEY, today);
  return next;
}

export async function getStreak(): Promise<number> {
  const today = dayKey();
  const last = await getMeta(LAST_ACTIVE_KEY);
  const current = Number((await getMeta(STREAK_KEY)) ?? '0');

  if (!last) return 0;
  if (last === today || last === yesterdayKey()) return current;
  return 0;
}
