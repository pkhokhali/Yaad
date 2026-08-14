import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { runCallAction } from '@/lib/services/notificationActions';
import { openVoiceCapture, submitVoiceCapture } from '@/lib/services/voiceCapture';
import { useReminderStore } from '@/store/useReminderStore';
import { useSettingsStore } from '@/store/useSettingsStore';

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/** Handle yaad:// deep links (capture, add, alert). */
export async function handleYaadDeepLink(url: string): Promise<boolean> {
  const parsed = Linking.parse(url);
  const host = parsed.hostname ?? parsed.path?.replace(/^\//, '') ?? '';

  if (host === 'capture' || host === 'voice') {
    const draft = firstString(parsed.queryParams?.draft);
    const voice = firstString(parsed.queryParams?.voice);
    if (draft) {
      const settings = useSettingsStore.getState().getSettings();
      await submitVoiceCapture(draft, settings);
      return true;
    }
    openVoiceCapture({ autoListen: voice !== '0' });
    return true;
  }

  if (host === 'add') {
    const draft = firstString(parsed.queryParams?.draft);
    const voice = firstString(parsed.queryParams?.voice);
    if (draft && voice !== '1') {
      router.push({ pathname: '/add', params: { draft } });
      return true;
    }
    if (draft) {
      const settings = useSettingsStore.getState().getSettings();
      await submitVoiceCapture(draft, settings);
      return true;
    }
    openVoiceCapture({ autoListen: voice !== '0' });
    return true;
  }

  if (host === 'alert') {
    const reminderId = firstString(parsed.queryParams?.reminderId);
    const action = firstString(parsed.queryParams?.action);
    if (!reminderId || !action) return false;

    const settings = useSettingsStore.getState().getSettings();
    const store = useReminderStore.getState();

    if (action === 'done') {
      await store.completeReminder(reminderId, settings);
      router.replace('/');
      return true;
    }
    if (action === 'snooze') {
      await store.snooze(reminderId, 30, settings);
      router.replace('/');
      return true;
    }
    if (action === 'call') {
      await runCallAction(reminderId);
      return true;
    }
  }

  return false;
}

export function attachYaadDeepLinkListener(): () => void {
  const onUrl = ({ url }: { url: string }) => {
    handleYaadDeepLink(url).catch(() => undefined);
  };

  Linking.getInitialURL().then((url) => {
    if (url) handleYaadDeepLink(url).catch(() => undefined);
  });

  const sub = Linking.addEventListener('url', onUrl);
  return () => sub.remove();
}

/** @deprecated use handleYaadDeepLink */
export async function handleAlertDeepLink(url: string): Promise<boolean> {
  return handleYaadDeepLink(url);
}

/** @deprecated use attachYaadDeepLinkListener */
export function attachAlertDeepLinkListener(): () => void {
  return attachYaadDeepLinkListener();
}
