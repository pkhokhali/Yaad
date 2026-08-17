import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  formatActionTitle,
  formatNotificationBody,
  formatSpokenAlert,
} from '@/lib/services/actionCopy';
import { ensureSpokenNotificationChannel } from '@/lib/services/ttsSound';
import { clearLogsForReminder, logNotification } from '@/lib/db/notificationLog';
import {
  createReminder,
  getReminderById,
  listReminders,
  updateReminder,
} from '@/lib/db/reminders';
import { careAlertOffsets, DAILY_UNTIL_DONE_DAYS, MIN_ALERT_GAP_MS } from '@/lib/care/alerts';
import { AppSettings, Reminder } from '@/types';

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

type ScheduleTier = string;

const ALL_TIERS: ScheduleTier[] = [
  'nudge',
  'alert',
  'insist1',
  'insist2',
  ...Array.from({ length: 6 }, (_, i) => `pre${i}`),
  ...Array.from({ length: 6 }, (_, i) => `post${i}`),
  ...Array.from({ length: 14 }, (_, i) => `daily${i}`),
];

function notificationId(reminderId: string, tier: ScheduleTier): string {
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
    enableVibrate: true,
    showBadge: true,
  });
  await Notifications.setNotificationChannelAsync('yaad-calls', {
    name: 'Yaad Calls',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#2563EB',
    enableVibrate: true,
    showBadge: true,
  });
  await Notifications.setNotificationChannelAsync('yaad-nudges', {
    name: 'Yaad Nudges',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 120],
    lightColor: '#C45C26',
  });
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function isInQuietHours(fireAt: number, settings: AppSettings): boolean {
  if (!settings.quietHoursEnabled) return false;

  const minutes = minutesOfDay(new Date(fireAt));
  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;

  if (start === end) return false;
  return start < end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;
}

/** Defer the due-time alert out of quiet hours. Extra nudges in quiet hours are skipped. */
export function adjustForQuietHours(
  fireAt: number,
  settings: AppSettings,
  isUrgent = false,
): number {
  if (!settings.quietHoursEnabled || isUrgent) return fireAt;
  if (!isInQuietHours(fireAt, settings)) return fireAt;

  const adjusted = new Date(fireAt);
  const end = settings.quietHoursEnd;
  adjusted.setHours(Math.floor(end / 60), end % 60, 0, 0);
  if (adjusted.getTime() <= fireAt) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted.getTime();
}

async function cancelReminderNotifications(reminderId: string): Promise<void> {
  await Promise.all(
    ALL_TIERS.map((tier) =>
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
  tier: ScheduleTier,
  when: number,
  settings: AppSettings,
): Promise<void> {
  if (when <= Date.now() + 1500) return;

  const isNudge = tier === 'nudge' || tier.startsWith('pre');
  const isFollowUp =
    tier.startsWith('post') || tier.startsWith('daily') || tier === 'insist1' || tier === 'insist2';
  const actionTitle = formatActionTitle(reminder.title, reminder.category);
  const title = isNudge
    ? `Soon: ${actionTitle}`
    : isFollowUp
      ? `Still open: ${actionTitle}`
      : actionTitle;
  const copyTier = isNudge ? 'nudge' : isFollowUp ? 'insist1' : 'alert';
  const body = isNudge
    ? `Coming up · ${formatTime(reminder.due_at)}`
    : formatNotificationBody(reminder.category, reminder.notes, copyTier);
  const spoken = formatSpokenAlert(
    reminder.title,
    reminder.category,
    settings.voiceLanguage ?? 'en',
    copyTier,
  );

  let channelId = isNudge
    ? 'yaad-nudges'
    : reminder.category === 'call'
      ? 'yaad-calls'
      : 'yaad-alerts';

  const isInterrupt =
    (reminder.category === 'call' || reminder.category === 'medicine') &&
    (tier === 'alert' || tier === 'post0');
  const useSpokenSound =
    settings.speakAlerts &&
    !isNudge &&
    Platform.OS === 'android' &&
    settings.notificationSound !== 'subtle';

  if (useSpokenSound) {
    const channelKey = `${reminder.id}-${tier}`;
    const spokenChannel = await ensureSpokenNotificationChannel(
      channelKey,
      spoken,
      settings.voiceLanguage ?? 'en',
    );
    if (spokenChannel) channelId = spokenChannel;
  }

  const androidSound =
    Platform.OS === 'android'
      ? undefined
      : settings.notificationSound === 'subtle'
        ? undefined
        : 'default';

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(reminder.id, tier),
    content: {
      title,
      body,
      sound: androidSound,
      priority: isInterrupt ? 'max' : 'high',
      sticky: isInterrupt,
      categoryIdentifier: categoryFor(reminder),
      data: {
        reminderId: reminder.id,
        tier,
        kind: 'reminder',
        category: reminder.category,
        spoken,
        speak: settings.speakAlerts,
        fullScreen: isInterrupt,
      },
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(when),
      channelId: Platform.OS === 'android' ? channelId : undefined,
    },
  });

  if (tier === 'nudge' || tier === 'alert' || tier.startsWith('pre')) {
    await logNotification(reminder.id, isNudge ? 'nudge' : 'alert', when);
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
  const { before, after } = careAlertOffsets(settings.alertsBeforeDeadline ?? 1);
  const booked: number[] = [];

  const takeSlot = (when: number): number | null => {
    if (when <= Date.now() + 1500) return null;
    if (booked.some((t) => Math.abs(t - when) < MIN_ALERT_GAP_MS)) return null;
    booked.push(when);
    return when;
  };

  for (const [index, minutesBefore] of before.entries()) {
    const raw = reminder.due_at - minutesBefore * 60 * 1000;
    if (isInQuietHours(raw, settings) && !isUrgent) continue;
    const when = takeSlot(raw);
    if (when != null) {
      await scheduleOne(reminder, `pre${index}`, when, settings);
    }
  }

  const dueWhen = takeSlot(
    isUrgent
      ? reminder.due_at
      : adjustForQuietHours(reminder.due_at, settings, isUrgent),
  );
  if (dueWhen != null) {
    await scheduleOne(reminder, 'alert', dueWhen, settings);
  }

  const dueBase = dueWhen ?? reminder.due_at;
  for (const [index, minutesAfter] of after.entries()) {
    const raw = dueBase + minutesAfter * 60 * 1000;
    if (isInQuietHours(raw, settings) && !isUrgent) continue;
    const when = takeSlot(raw);
    if (when != null) {
      await scheduleOne(reminder, `post${index}`, when, settings);
    }
  }

  if (!reminder.repeat_rule) {
    const due = new Date(reminder.due_at);
    for (let day = 1; day <= DAILY_UNTIL_DONE_DAYS; day += 1) {
      const next = new Date(due);
      next.setDate(due.getDate() + day);
      const raw = next.getTime();
      if (isInQuietHours(raw, settings) && !isUrgent) continue;
      const when = takeSlot(raw);
      if (when != null) {
        await scheduleOne(reminder, `daily${day - 1}`, when, settings);
      }
    }
  }

  await refreshEveningSweep(settings);
}

export async function cancelAllForReminder(reminderId: string): Promise<void> {
  await cancelReminderNotifications(reminderId);
  await clearLogsForReminder(reminderId);
}

export async function rescheduleOpenReminders(
  settings: AppSettings,
): Promise<void> {
  const open = (await listReminders()).filter((r) => !r.is_done);
  for (const reminder of open) {
    await scheduleReminderNotifications(reminder, settings);
  }
}

/** Evening digest is disabled — one reminder should not become a pile of alerts. */
export async function refreshEveningSweep(
  _settings: AppSettings,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(SWEEP_ID).catch(
    () => undefined,
  );
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
    image_uri: reminder.image_uri ?? null,
    items: (reminder.items ?? []).map((item) => ({ ...item, done: false })),
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
