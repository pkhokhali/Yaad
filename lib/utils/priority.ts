import { PriorityBucket, YaadItem } from '@/types/yaad';

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function isOpenItem(item: YaadItem): boolean {
  return item.status !== 'Done';
}

export function isDueToday(item: YaadItem, now = new Date()): boolean {
  return item.dueDate >= startOfDay(now) && item.dueDate <= endOfDay(now);
}

export function isUpcoming(item: YaadItem, now = new Date()): boolean {
  const inSevenDays = now.getTime() + 7 * MS_DAY;
  return item.dueDate > endOfDay(now) && item.dueDate <= inSevenDays;
}

export function isUrgent(item: YaadItem, now = new Date()): boolean {
  const ts = now.getTime();
  if (item.status === 'Missed') return true;
  if (item.dueDate < ts) return true;
  return item.dueDate - ts <= 3 * MS_HOUR;
}

export function filterByBucket(
  items: YaadItem[],
  bucket: PriorityBucket,
  now = new Date(),
): YaadItem[] {
  const open = items.filter(isOpenItem);

  switch (bucket) {
    case 'Today':
      return open
        .filter((item) => isDueToday(item, now))
        .sort((a, b) => a.dueDate - b.dueDate);
    case 'Upcoming':
      return open
        .filter((item) => isUpcoming(item, now))
        .sort((a, b) => a.dueDate - b.dueDate);
    case 'Important':
      return open
        .filter((item) => item.isImportant)
        .sort((a, b) => a.dueDate - b.dueDate);
    case 'Urgent':
      return open
        .filter((item) => isUrgent(item, now))
        .sort((a, b) => a.dueDate - b.dueDate);
    default:
      return [];
  }
}

export function deriveMissedStatus(items: YaadItem[], now = new Date()): YaadItem[] {
  const ts = now.getTime();
  return items.map((item) => {
    if (item.status === 'Done' || item.status === 'Missed') return item;
    if (item.dueDate < ts - 30 * 60 * 1000) {
      return { ...item, status: 'Missed' as const };
    }
    return item;
  });
}
