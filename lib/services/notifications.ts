import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { clearLogsForReminder, logNotification } from '@/lib/db/notificationLog';
import {
  createReminder,
  getReminderById,
  updateReminder,
} from '@/lib/db/reminders';
import { AppSettings, Reminder, UrgencyCurve } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SCHEDULED_PREFIX = 'yaad';

function notificationId(reminderId: string, tier: 'nudge' | 'alert'): string {
  return `${SCHEDULED_PREFIX}:${reminderId}:${tier}`;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice && Platform.OS !== 'web') {
    // Simulators can still schedule; permission APIs vary
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('yaad-alerts', {
      name: 'Yaad Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C45C26',
    });
    await Notifications.setNotificationChannelAsync('yaad-nudges', {
      name: 'Yaad Nudges',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 120],
      lightColor: '#C45C26',
    });
  }
  return status === 'granted';
}

/** Defer fire times that land inside quiet hours to quietHoursEnd (same or next day). */
export function adjustForQuietHours(
  fireAt: number,
  settings: AppSettings,
  isUrgent = false,
): number {
  if (!settings.quietHoursEnabled || isUrgent) return fireAt;

  const date = new Date(fireAt);
  const hour = date.getHours();
  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;

  const inQuiet =
    start === end
      ? false
      : start < end
        ? hour >= start && hour < end
        : hour >= start || hour < end;

  if (!inQuiet) return fireAt;

  const adjusted = new Date(fireAt);
  adjusted.setHours(end, 0, 0, 0);
  if (adjusted.getTime() <= fireAt) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted.getTime();
}

async function cancelReminderNotifications(reminderId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    notificationId(reminderId, 'nudge'),
  ).catch(() => undefined);
  await Notifications.cancelScheduledNotificationAsync(
    notificationId(reminderId, 'alert'),
  ).catch(() => undefined);
}

async function scheduleOne(
  reminder: Reminder,
  tier: 'nudge' | 'alert',
  when: number,
  settings: AppSettings,
): Promise<void> {
  if (when <= Date.now() + 1500) return;

  const channelId = tier === 'nudge' ? 'yaad-nudges' : 'yaad-alerts';
  const body =
    tier === 'nudge'
      ? `Coming up in about an hour · ${formatTime(reminder.due_at)}`
      : reminder.notes || 'Tap to open';

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(reminder.id, tier),
    content: {
      title: tier === 'nudge' ? `Soon: ${reminder.title}` : reminder.title,
      body,
      sound: settings.notificationSound === 'subtle' ? undefined : 'default',
      data: { reminderId: reminder.id, tier },
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(when),
      channelId: Platform.OS === 'android' ? channelId : undefined,
    },
  });

  // Pre-log scheduled intent with planned fire time (actual delivery is OS-managed)
  await logNotification(reminder.id, tier, when);
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export async function scheduleReminderNotifications(
  reminder: Reminder,
  settings: AppSettings,
): Promise<void> {
  await ensureNotificationPermissions();
  await cancelReminderNotifications(reminder.id);
  await clearLogsForReminder(reminder.id);

  if (reminder.is_done) return;

  const isUrgent = Boolean(reminder.is_urgent);
  const curve: UrgencyCurve = reminder.urgency_curve || 'standard';

  if (curve === 'escalating') {
    const nudgeAt = adjustForQuietHours(
      reminder.due_at - 60 * 60 * 1000,
      settings,
      isUrgent,
    );
    const alertAt = adjustForQuietHours(reminder.due_at, settings, isUrgent);
    await scheduleOne(reminder, 'nudge', nudgeAt, settings);
    await scheduleOne(reminder, 'alert', alertAt, settings);
  } else {
    const alertAt = adjustForQuietHours(reminder.due_at, settings, isUrgent);
    await scheduleOne(reminder, 'alert', alertAt, settings);
  }
}

export async function cancelAllForReminder(reminderId: string): Promise<void> {
  await cancelReminderNotifications(reminderId);
  await clearLogsForReminder(reminderId);
}

export function nextOccurrenceDueAt(
  dueAt: number,
  rule: Reminder['repeat_rule'],
): number | null {
  if (!rule) return null;
  const next = new Date(dueAt);
  if (rule === 'daily') {
    next.setDate(next.getDate() + 1);
    return next.getTime();
  }
  if (rule === 'weekly') {
    next.setDate(next.getDate() + 7);
    return next.getTime();
  }
  if (rule === 'after_visit') {
    // Default next business-day morning for field follow-ups
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next.getTime();
  }
  return null;
}

/** When a repeating reminder is marked done, spawn the next occurrence. */
export async function completeWithRepeat(
  reminder: Reminder,
  settings: AppSettings,
): Promise<Reminder | null> {
  await updateReminder(reminder.id, { is_done: 1 });
  await cancelAllForReminder(reminder.id);

  const nextDue = nextOccurrenceDueAt(reminder.due_at, reminder.repeat_rule);
  if (nextDue == null) return null;

  const next = await createReminder({
    title: reminder.title,
    notes: reminder.notes,
    due_at: nextDue,
    category: reminder.category,
    repeat_rule: reminder.repeat_rule,
    urgency_curve: reminder.urgency_curve,
    is_urgent: Boolean(reminder.is_urgent),
  });
  await scheduleReminderNotifications(next, settings);
  return next;
}

/** Quietly escalate if the user keeps snoozing the same item. */
export async function maybeAdaptUrgency(reminderId: string): Promise<void> {
  const reminder = await getReminderById(reminderId);
  if (!reminder || reminder.urgency_curve === 'escalating') return;

  // Heuristic: snoozed enough that due_at is far past created window + user still open
  const ageHours = (Date.now() - reminder.created_at) / (1000 * 60 * 60);
  if (ageHours >= 3 && reminder.due_at < Date.now()) {
    await updateReminder(reminderId, { urgency_curve: 'escalating' });
  }
}

export function findNearestUpcoming(
  reminders: Reminder[],
  withinMinutes = 30,
): string | null {
  const now = Date.now();
  const windowEnd = now + withinMinutes * 60 * 1000;
  const candidates = reminders
    .filter((r) => !r.is_done && r.due_at >= now - 5 * 60 * 1000 && r.due_at <= windowEnd)
    .sort((a, b) => a.due_at - b.due_at);
  return candidates[0]?.id ?? null;
}
