import { getMeta, setMeta } from '@/lib/db/database';

const STREAK_KEY = 'streak';
const LAST_ACTIVITY_KEY = 'last_activity_date';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getStreak(): Promise<number> {
  const raw = await getMeta(STREAK_KEY);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

export async function recordActivity(): Promise<number> {
  const today = todayKey();
  const last = await getMeta(LAST_ACTIVITY_KEY);
  let streak = await getStreak();

  if (last === today) return streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  streak = last === y ? streak + 1 : 1;

  await setMeta(STREAK_KEY, String(streak));
  await setMeta(LAST_ACTIVITY_KEY, today);
  return streak;
}
