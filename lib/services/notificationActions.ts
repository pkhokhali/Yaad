import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Linking, Platform } from 'react-native';

import { getReminderById } from '@/lib/db/reminders';
import { extractPhone, parseVoiceReply } from '@/lib/services/voiceReply';
import { useReminderStore } from '@/store/useReminderStore';
import { useSettingsStore } from '@/store/useSettingsStore';

let lastHandledKey = '';

function responseKey(response: Notifications.NotificationResponse): string {
  return [
    response.notification.request.identifier,
    response.actionIdentifier,
    response.userText ?? '',
  ].join('|');
}

async function runCall(reminderId: string): Promise<void> {
  const reminder = await getReminderById(reminderId);
  const phone = extractPhone(
    `${reminder?.title ?? ''} ${reminder?.notes ?? ''}`,
  );
  if (phone && Platform.OS !== 'web') {
    await Linking.openURL(`tel:${phone}`);
    return;
  }
  router.push(`/reminder/${reminderId}`);
}

/** Handle lock-screen Done / Snooze / Call / Voice without opening the list. */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<void> {
  const key = responseKey(response);
  if (key === lastHandledKey) return;
  lastHandledKey = key;

  const data = response.notification.request.content.data as
    | { reminderId?: string; kind?: string }
    | undefined;
  const reminderId = data?.reminderId;
  const action = response.actionIdentifier;
  const isDefault =
    action === Notifications.DEFAULT_ACTION_IDENTIFIER ||
    action === 'expo.modules.notifications.actions.DEFAULT';

  if (isDefault) {
    if (data?.kind === 'sweep') {
      router.push('/');
      return;
    }
    if (reminderId) router.push(`/reminder/${reminderId}`);
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
