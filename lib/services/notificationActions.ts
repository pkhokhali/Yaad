import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AppState, Linking, Platform } from 'react-native';

import { getReminderById, markDone, snoozeReminder } from '@/lib/db/reminders';
import { recordNotificationFired } from '@/lib/db/notificationLog';
import { announceFromNotification } from '@/lib/services/announce';
import {
  cancelAllForReminder,
  completeWithRepeat,
  maybeAdaptUrgency,
  refreshEveningSweep,
  scheduleReminderNotifications,
} from '@/lib/services/notifications';
import { loadPersistedSettings } from '@/lib/settings/loadSettings';
import { extractPhone, parseVoiceReply } from '@/lib/services/voiceReply';
import { useYaadItemStore } from '@/store/useYaadItemStore';
import { AppSettings, Category } from '@/types';

function reminderIdFromResponse(
  response: Notifications.NotificationResponse,
  data?: { reminderId?: string },
): string | undefined {
  if (typeof data?.reminderId === 'string' && data.reminderId) {
    return data.reminderId;
  }
  const identifier = response.notification.request.identifier ?? '';
  const match = /^yaad:([^:]+):/.exec(identifier);
  return match?.[1];
}

function normalizeAction(action: string): string {
  const raw = action.trim();
  const last = raw.split('.').pop() ?? raw;
  return last.toLowerCase();
}

let lastHandledKey = '';
let lastSpokenKey = '';

function responseKey(response: Notifications.NotificationResponse): string {
  return [
    response.notification.request.identifier,
    response.actionIdentifier,
    response.userText ?? '',
  ].join('|');
}

async function speakNotificationPayload(
  data: Record<string, unknown> | undefined,
  title?: string | null,
  body?: string | null,
  settings?: AppSettings,
): Promise<void> {
  const appSettings = settings ?? (await loadPersistedSettings());
  if (!appSettings.speakAlerts) return;

  const key = `${data?.reminderId ?? ''}|${data?.tier ?? ''}|${title ?? ''}`;
  if (key && key === lastSpokenKey) return;
  lastSpokenKey = key;

  announceFromNotification({
    title,
    body,
    spoken: typeof data?.spoken === 'string' ? data.spoken : null,
    category: (data?.category as Category) || 'general',
    tier:
      typeof data?.tier === 'string' && String(data?.tier).startsWith('pre')
        ? 'nudge'
        : (data?.tier as 'nudge' | 'alert' | 'insist1' | 'insist2') || 'alert',
    language: appSettings.voiceLanguage,
  });
}

async function runCall(reminderId: string): Promise<void> {
  const reminder = await getReminderById(reminderId);
  const settings = await loadPersistedSettings();
  if (settings.speakAlerts && reminder) {
    announceFromNotification({
      title: reminder.title,
      category: reminder.category,
      spoken: null,
      language: settings.voiceLanguage,
    });
  }

  const phone = extractPhone(
    `${reminder?.title ?? ''} ${reminder?.notes ?? ''}`,
  );
  if (Platform.OS === 'web') {
    router.push(`/reminder/${reminderId}`);
    return;
  }

  try {
    await Linking.openURL(phone ? `tel:${phone}` : 'tel:');
  } catch {
    router.push(`/reminder/${reminderId}`);
  }
}

export async function runCallAction(reminderId: string): Promise<void> {
  await runCall(reminderId);
}

export function speakForReceivedNotification(
  notification: Notifications.Notification,
): void {
  const data = notification.request.content.data as
    | Record<string, unknown>
    | undefined;
  if (data?.kind === 'sweep') return;

  const reminderId = typeof data?.reminderId === 'string' ? data.reminderId : null;
  const tier = typeof data?.tier === 'string' ? data.tier : 'alert';
  if (reminderId) {
    void recordNotificationFired(reminderId, tier);
  }

  void speakNotificationPayload(
    data,
    notification.request.content.title,
    notification.request.content.body,
  );
}

async function completeReminderHeadless(
  reminderId: string,
  settings: AppSettings,
): Promise<void> {
  const reminder = await getReminderById(reminderId);
  if (!reminder) return;
  if (reminder.repeat_rule) {
    await completeWithRepeat(reminder, settings);
  } else {
    await markDone(reminderId);
    await cancelAllForReminder(reminderId);
    await refreshEveningSweep(settings);
  }
}

async function snoozeReminderHeadless(
  reminderId: string,
  minutes: number,
  settings: AppSettings,
): Promise<void> {
  await snoozeReminder(reminderId, minutes);
  await maybeAdaptUrgency(reminderId);
  const reminder = await getReminderById(reminderId);
  if (reminder) {
    await scheduleReminderNotifications(reminder, settings);
  }
}

/** Works in foreground and headless background (no router required for Done/Snooze). */
export async function processNotificationResponse(
  response: Notifications.NotificationResponse,
  options?: { allowNavigation?: boolean },
): Promise<void> {
  const allowNavigation = options?.allowNavigation !== false;
  const key = responseKey(response);
  if (key === lastHandledKey) return;
  lastHandledKey = key;

  const data = response.notification.request.content.data as
    | {
        reminderId?: string;
        kind?: string;
        spoken?: string;
        category?: Category;
        tier?: 'nudge' | 'alert' | 'insist1' | 'insist2';
      }
    | undefined;
  const reminderId = reminderIdFromResponse(response, data);
  const action = normalizeAction(response.actionIdentifier);
  const isDefault =
    action === 'default' ||
    response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER ||
    response.actionIdentifier === 'expo.modules.notifications.actions.DEFAULT';

  const settings = await loadPersistedSettings();

  if (data?.kind !== 'sweep' && isDefault) {
    await speakNotificationPayload(
      data as Record<string, unknown> | undefined,
      response.notification.request.content.title,
      response.notification.request.content.body,
      settings,
    );
  }

  if (isDefault) {
    if (!allowNavigation) return;
    if (data?.kind === 'sweep') {
      router.push('/');
      return;
    }
    if (reminderId) {
      const reminder = await getReminderById(reminderId);
      if (reminder?.category === 'call') {
        await runCall(reminderId);
        return;
      }
      router.push(`/reminder/${reminderId}`);
    }
    return;
  }

  if (!reminderId) return;

  let intent = action;
  if (action === 'voice') {
    if (!allowNavigation) return;
    const parsed = parseVoiceReply(response.userText ?? '');
    if (!parsed) {
      router.push(`/reminder/${reminderId}`);
      return;
    }
    intent = parsed;
  }

  if (intent === 'done') {
    await completeReminderHeadless(reminderId, settings);
    await useYaadItemStore.getState().refresh().catch(() => undefined);
    await Notifications.dismissNotificationAsync(
      response.notification.request.identifier,
    ).catch(() => undefined);
    await Notifications.cancelScheduledNotificationAsync(
      response.notification.request.identifier,
    ).catch(() => undefined);
    return;
  }

  if (intent === 'snooze') {
    await snoozeReminderHeadless(reminderId, 30, settings);
    await useYaadItemStore.getState().refresh().catch(() => undefined);
    await Notifications.dismissNotificationAsync(
      response.notification.request.identifier,
    ).catch(() => undefined);
    return;
  }

  if (intent === 'call' && allowNavigation) {
    await runCall(reminderId);
  }
}

/** Handle lock-screen Done / Snooze / Call without opening the list. */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<void> {
  await processNotificationResponse(response, { allowNavigation: true });
}

/** If app returns to foreground right as something is due, speak once. */
export function attachDueSpeechOnForeground(): () => void {
  const sub = AppState.addEventListener('change', async (state) => {
    if (state !== 'active') return;
    const settings = await loadPersistedSettings();
    if (!settings.speakAlerts) return;

    const { listReminders } = await import('@/lib/db/reminders');
    const all = await listReminders();
    const now = Date.now();
    const due = all.find(
      (r) =>
        !r.is_done && r.due_at <= now && r.due_at >= now - 2 * 60 * 1000,
    );
    if (!due) return;

    const key = `fg|${due.id}|${due.due_at}`;
    if (key === lastSpokenKey) return;
    lastSpokenKey = key;
    announceFromNotification({
      title: due.title,
      category: due.category,
      language: settings.voiceLanguage,
    });
  });
  return () => sub.remove();
}
