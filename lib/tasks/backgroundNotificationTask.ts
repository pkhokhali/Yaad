import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { showCallAlert } from 'yaad-native';

import { announceFromNotification } from '@/lib/services/announce';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Category } from '@/types';

export const YAAD_BACKGROUND_NOTIFICATION_TASK = 'YAAD_BACKGROUND_NOTIFICATION';

TaskManager.defineTask(YAAD_BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    return Notifications.BackgroundNotificationTaskResult.Failed;
  }

  const payload = data as Record<string, unknown> | undefined;
  if (!payload) {
    return Notifications.BackgroundNotificationTaskResult.NoData;
  }

  if ('actionIdentifier' in payload) {
    return Notifications.BackgroundNotificationTaskResult.NoData;
  }

  let notification: Notifications.Notification | null = null;
  if ('request' in payload && payload.request) {
    notification = payload as unknown as Notifications.Notification;
  } else if (
    'notification' in payload &&
    payload.notification &&
    typeof payload.notification === 'object'
  ) {
    notification = payload.notification as Notifications.Notification;
  }

  if (!notification) {
    return Notifications.BackgroundNotificationTaskResult.NoData;
  }

  const content = notification.request.content;
  const ndata = content.data as
    | {
        kind?: string;
        category?: Category;
        tier?: string;
        reminderId?: string;
        spoken?: string;
        fullScreen?: boolean;
        speak?: boolean;
      }
    | undefined;

  if (!ndata || ndata.kind === 'sweep') {
    return Notifications.BackgroundNotificationTaskResult.NoData;
  }

  const settings = useSettingsStore.getState().getSettings();

  if (settings.speakAlerts && ndata.speak !== false) {
    announceFromNotification({
      title: content.title,
      body: content.body,
      spoken: typeof ndata.spoken === 'string' ? ndata.spoken : null,
      category: ndata.category || 'general',
      tier:
        (ndata.tier as 'nudge' | 'alert' | 'insist1' | 'insist2') || 'alert',
      language: settings.voiceLanguage,
    });
  }

  const shouldFullScreen =
    Platform.OS === 'android' &&
    ndata.fullScreen === true &&
    ndata.reminderId &&
    ndata.category === 'call';

  if (shouldFullScreen) {
    showCallAlert(
      ndata.reminderId!,
      content.title ?? 'Call reminder',
      content.body ?? '',
      typeof ndata.spoken === 'string' ? ndata.spoken : content.title ?? '',
    ).catch(() => undefined);
  }

  return Notifications.BackgroundNotificationTaskResult.NoData;
});

export async function registerBackgroundNotificationTask(): Promise<void> {
  try {
    await Notifications.registerTaskAsync(YAAD_BACKGROUND_NOTIFICATION_TASK);
  } catch {
    // Already registered or unavailable in Expo Go
  }
}
