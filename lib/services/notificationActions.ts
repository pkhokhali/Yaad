import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AppState, Linking, Platform } from 'react-native';

import { getReminderById } from '@/lib/db/reminders';
import { announceFromNotification } from '@/lib/services/announce';
import { extractPhone, parseVoiceReply } from '@/lib/services/voiceReply';
import { useReminderStore } from '@/store/useReminderStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Category } from '@/types';

let lastHandledKey = '';
let lastSpokenKey = '';

function responseKey(response: Notifications.NotificationResponse): string {
  return [
    response.notification.request.identifier,
    response.actionIdentifier,
    response.userText ?? '',
  ].join('|');
}

function speakNotificationPayload(
  data: Record<string, unknown> | undefined,
  title?: string | null,
  body?: string | null,
): void {
  const settings = useSettingsStore.getState().getSettings();
  if (!settings.speakAlerts) return;

  const key = `${data?.reminderId ?? ''}|${data?.tier ?? ''}|${title ?? ''}`;
  if (key && key === lastSpokenKey) return;
  lastSpokenKey = key;

  announceFromNotification({
    title,
    body,
    spoken: typeof data?.spoken === 'string' ? data.spoken : null,
    category: (data?.category as Category) || 'general',
    tier:
      typeof data?.tier === 'string' && String(data.tier).startsWith('pre')
        ? 'nudge'
        : (data?.tier as 'nudge' | 'alert' | 'insist1' | 'insist2') || 'alert',
    language: settings.voiceLanguage,
  });
}

async function runCall(reminderId: string): Promise<void> {
  const reminder = await getReminderById(reminderId);
  const settings = useSettingsStore.getState().getSettings();
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

  // Always open the dialer for call actions — with number if we have one.
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
  speakNotificationPayload(
    data,
    notification.request.content.title,
    notification.request.content.body,
  );
}

/** Handle lock-screen Done / Snooze / Call / Voice without opening the list. */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<void> {
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
  const reminderId = data?.reminderId;
  const action = response.actionIdentifier;
  const isDefault =
    action === Notifications.DEFAULT_ACTION_IDENTIFIER ||
    action === 'expo.modules.notifications.actions.DEFAULT';

  // Speak when the user opens / acts on the alert (covers background fire).
  if (data?.kind !== 'sweep') {
    speakNotificationPayload(
      data as Record<string, unknown> | undefined,
      response.notification.request.content.title,
      response.notification.request.content.body,
    );
  }

  if (isDefault) {
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

  const settings = useSettingsStore.getState().getSettings();
  const store = useReminderStore.getState();

  let intent = action as string;
  if (action === 'voice') {
    const parsed = parseVoiceReply(response.userText ?? '');
    if (!parsed) {
      router.push(`/reminder/${reminderId}`);
      return;
    }
    intent = parsed;
  }

  if (intent === 'done') {
    await store.completeReminder(reminderId, settings);
    await Notifications.dismissNotificationAsync(
      response.notification.request.identifier,
    ).catch(() => undefined);
    return;
  }

  if (intent === 'snooze') {
    await store.snooze(reminderId, 30, settings);
    await Notifications.dismissNotificationAsync(
      response.notification.request.identifier,
    ).catch(() => undefined);
    return;
  }

  if (intent === 'call') {
    await runCall(reminderId);
  }
}

/** If app returns to foreground right as something is due, speak once. */
export function attachDueSpeechOnForeground(): () => void {
  const sub = AppState.addEventListener('change', async (state) => {
    if (state !== 'active') return;
    const settings = useSettingsStore.getState().getSettings();
    if (!settings.speakAlerts) return;

    const now = Date.now();
    const due = useReminderStore
      .getState()
      .reminders.find(
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
