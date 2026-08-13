import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { clearLogsForReminder, logNotification } from '@/lib/db/notificationLog';
import {
  createReminder,
  getReminderById,
  listOpenThrough,
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
export const CATEGORY_ALERT = 'yaadAlert';
export const CATEGORY_CALL = 'yaadCall';
const SWEEP_ID = 'yaadSweep';

function notificationId(
  reminderId: string,
  tier: 'nudge' | 'alert' | 'insist1' | 'insist2',
): string {
  return `${SCHEDULED_PREFIX}:${reminderId}:${tier}`;
}

export async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CATEGORY_ALERT, [
    {
      identifier: 'done',
      buttonTitle: 'Done',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Snooze 30m',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'voice',
      buttonTitle: 'Voice',
      textInput: {
        placeholder: 'done, snooze, call…',
        submitButtonTitle: 'Go',
      },
      options: { opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(CATEGORY_CALL, [
    {
      identifier: 'call',
      buttonTitle: 'Call',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'done',
      buttonTitle: 'Done',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Snooze 30m',
      options: { opensAppToForeground: false },
    },
  ]);
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice && Platform.OS !== 'web') {
    // Simulators can still schedule; permission APIs vary
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    await setupAndroidChannels();
    await registerNotificationCategories();
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  await setupAndroidChannels();
  if (status === 'granted') {
    await registerNotificationCategories();
  }
  return status === 'granted';
}

async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
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
  await Promise.all(
    (['nudge', 'alert', 'insist1', 'insist2'] as const).map((tier) =>
      Notifications.cancelScheduledNotificationAsync(
        notificationId(reminderId, tier),
      ).catch(() => undefined),
    ),
  );
}

function categoryFor(reminder: Reminder): string {
  return reminder.category === 'call' ? CATEGORY_CALL : CATEGORY_ALERT;
}

async function scheduleOne(
  reminder: Reminder,
  tier: 'nudge' | 'alert' | 'insist1' | 'insist2',
  when: number,
  settings: AppSettings,
): Promise<void> {
  if (when <= Date.now() + 1500) return;

  const isNudge = tier === 'nudge';
  const isInsist = tier === 'insist1' || tier === 'insist2';
  const channelId = isNudge ? 'yaad-nudges' : 'yaad-alerts';
  const title = isNudge
    ? `Soon: ${reminder.title}`
    : isInsist
      ? `Still open: ${reminder.title}`
      : reminder.title;
  const body = isNudge
    ? `Coming up in about an hour · ${formatTime(reminder.due_at)}`
    : isInsist
      ? 'Done · Snooze · or say it on Voice'
      : reminder.category === 'call'
        ? 'Call · Done · Snooze 30m'
        : reminder.notes || 'Done · Snooze · Voice';

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(reminder.id, tier),
    content: {
      title,
      body,
      sound: settings.notificationSound === 'subtle' ? undefined : 'default',
      categoryIdentifier: categoryFor(reminder),
      data: {
        reminderId: reminder.id,
        tier,
        kind: 'reminder',
        category: reminder.category,
      },
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(when),
      channelId: Platform.OS === 'android' ? channelId : undefined,
    },
  });

  if (tier === 'nudge' || tier === 'alert') {
    await logNotification(reminder.id, tier, when);
  }
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

  if (reminder.is_done) {
    await refreshEveningSweep(settings);
    return;
  }

  const isUrgent = Boolean(reminder.is_urgent);
  const curve: UrgencyCurve = reminder.urgency_curve || 'standard';
  const alertAt = adjustForQuietHours(reminder.due_at, settings, isUrgent);

  if (curve === 'escalating') {
    const nudgeAt = adjustForQuietHours(
      reminder.due_at - 60 * 60 * 1000,
      settings,
      isUrgent,
    );
    await scheduleOne(reminder, 'nudge', nudgeAt, settings);
  }

  await scheduleOne(reminder, 'alert', alertAt, settings);
  await scheduleOne(
    reminder,
    'insist1',
    adjustForQuietHours(alertAt + 30 * 60 * 1000, settings, isUrgent),
    settings,
  );
  await scheduleOne(
    reminder,
    'insist2',
    adjustForQuietHours(alertAt + 2 * 60 * 60 * 1000, settings, isUrgent),
    settings,
  );
  await refreshEveningSweep(settings);
}

export async function cancelAllForReminder(reminderId: string): Promise<void> {
  await cancelReminderNotifications(reminderId);
  await clearLogsForReminder(reminderId);
}

function nextSweepAt(settings: AppSettings): Date {
  const d = new Date();
  let hour = 20;
  if (settings.quietHoursEnabled) {
    const start = settings.quietHoursStart;
    const end = settings.quietHoursEnd;
    const inQuiet =
      start === end
        ? false
        : start < end
          ? hour >= start && hour < end
          : hour >= start || hour < end;
    if (inQuiet) {
      hour = (start + 23) % 24;
    }
  }
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= Date.now() + 60_000) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** One evening interrupt listing what's still open. Rescheduled on every change. */
export async function refreshEveningSweep(
  settings: AppSettings,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(SWEEP_ID).catch(
    () => undefined,
  );

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const open = await listOpenThrough(end.getTime());
  if (open.length === 0) return;

  const when = nextSweepAt(settings);
  const body =
    open.length === 1
      ? `Still with you: ${open[0].title}`
      : `${open.length} still open · ${open
          .slice(0, 2)
          .map((r) => r.title)
          .join(', ')}`;

  await Notifications.scheduleNotificationAsync({
    identifier: SWEEP_ID,
    content: {
      title: 'Yaad',
      body,
      sound: settings.notificationSound === 'subtle' ? undefined : 'default',
      data: { kind: 'sweep' },
      ...(Platform.OS === 'android' ? { channelId: 'yaad-nudges' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: Platform.OS === 'android' ? 'yaad-nudges' : undefined,
    },
  });
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
  if (nextDue == null) {
    await refreshEveningSweep(settings);
    return null;
  }

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
  const overdue = reminders
    .filter((r) => !r.is_done && r.due_at < now)
    .sort((a, b) => a.due_at - b.due_at);
  if (overdue[0]) return overdue[0].id;

  const windowEnd = now + withinMinutes * 60 * 1000;
  const candidates = reminders
    .filter(
      (r) =>
        !r.is_done && r.due_at >= now - 5 * 60 * 1000 && r.due_at <= windowEnd,
    )
    .sort((a, b) => a.due_at - b.due_at);
  return candidates[0]?.id ?? null;
}
