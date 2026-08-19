import { Platform } from 'react-native';

import {
  dueToday,
  formatDueLabel,
  nextReminder,
  openReminders,
  overdue,
} from '@/lib/dashboard/reminders';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useYaadItemStore } from '@/store/useYaadItemStore';
import { Reminder } from '@/types';

function buildSummary(todayCount: number, overdueCount: number, streak: number): string {
  const parts: string[] = [];
  if (todayCount > 0) {
    parts.push(todayCount === 1 ? '1 due today' : `${todayCount} due today`);
  }
  if (overdueCount > 0) {
    parts.push(overdueCount === 1 ? '1 overdue' : `${overdueCount} overdue`);
  }
  if (streak > 0) {
    parts.push(`${streak}-day streak`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Tap mic to add a reminder';
}

/** Push reminder snapshot to Android home screen widgets. */
export async function syncHomeWidget(reminders: Reminder[]): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const { updateHomeWidget } = await import('yaad-native');
    const open = openReminders(reminders);
    const next = nextReminder(reminders);
    const lateCount = overdue(open).length;
    const todayCount = dueToday(open).length;
    const streak = useYaadItemStore.getState().streak;
    const displayName = useSettingsStore.getState().displayName?.trim();
    const summary = buildSummary(todayCount, lateCount, streak);

    await updateHomeWidget({
      brand: displayName && displayName.length > 0 ? displayName : 'Yaad',
      nextTitle: next?.title ?? (lateCount > 0 ? `${lateCount} overdue` : 'All clear'),
      nextTime: next
        ? formatDueLabel(next.due_at)
        : lateCount > 0
          ? 'Open Yaad to catch up'
          : 'Nothing scheduled',
      overdueCount: lateCount,
      todayCount,
      streak,
      summaryLine: summary,
    });
  } catch {
    // Native widgets unavailable in Expo Go.
  }
}
