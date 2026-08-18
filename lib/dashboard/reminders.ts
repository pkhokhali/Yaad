import { Reminder } from '@/types';
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from '@/lib/dashboard/dates';

export function isTodoReminder(reminder: Reminder): boolean {
  return reminder.category === 'general' && !reminder.repeat_rule;
}

export function isTaskReminder(reminder: Reminder): boolean {
  return !isTodoReminder(reminder);
}

export function openReminders(reminders: Reminder[]): Reminder[] {
  return reminders.filter((r) => !r.is_done);
}

export function todos(reminders: Reminder[]): Reminder[] {
  return openReminders(reminders).filter(isTodoReminder);
}

export function tasks(reminders: Reminder[]): Reminder[] {
  return openReminders(reminders).filter(isTaskReminder);
}

export function dueToday(reminders: Reminder[]): Reminder[] {
  const start = startOfDay().getTime();
  const end = endOfDay().getTime();
  return openReminders(reminders).filter(
    (r) => r.due_at >= start && r.due_at <= end,
  );
}

export function dueThisWeek(reminders: Reminder[]): Reminder[] {
  const start = startOfWeek().getTime();
  const end = endOfWeek().getTime();
  return openReminders(reminders).filter(
    (r) => r.due_at >= start && r.due_at <= end,
  );
}

export function overdue(reminders: Reminder[]): Reminder[] {
  return openReminders(reminders).filter((r) => r.due_at < startOfDay().getTime());
}

export function done(reminders: Reminder[]): Reminder[] {
  return reminders.filter((r) => Boolean(r.is_done));
}

export function nextReminder(reminders: Reminder[]): Reminder | null {
  const now = Date.now();
  const upcoming = openReminders(reminders)
    .filter((r) => r.due_at >= now)
    .sort((a, b) => a.due_at - b.due_at);
  return upcoming[0] ?? null;
}

export function formatDueLabel(ts: number): string {
  return new Date(ts).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
