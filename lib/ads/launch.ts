import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

import { showLaunchInterstitial } from '@/lib/ads/interstitial';

function isRecent(ts: number, windowMs: number): boolean {
  const ms = ts < 1e12 ? ts * 1000 : ts;
  return Date.now() - ms < windowMs;
}

async function openedFromReminder(): Promise<boolean> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response && isRecent(response.notification.date, 30_000)) {
      return true;
    }
  } catch {
    // ignore
  }
  try {
    const url = await Linking.getInitialURL();
    if (!url) return false;
    const parsed = Linking.parse(url);
    const host = parsed.hostname ?? parsed.path?.replace(/^\//, '') ?? '';
    return host === 'alert' || host === 'capture' || host === 'voice' || host === 'add';
  } catch {
    return false;
  }
}

/** After splash + onboarding. Skip if the user opened Yaad from a reminder. */
export async function maybeShowLaunchAd(): Promise<void> {
  if (await openedFromReminder()) return;
  await showLaunchInterstitial();
}
