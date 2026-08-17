import { Platform } from 'react-native';

import { AD_UNITS } from '@/lib/ads/units';

let loading = false;
let shownThisProcess = false;
let loadedAd: {
  show: () => Promise<void>;
} | null = null;
let loadWaiters: Array<(ready: boolean) => void> = [];

function notifyWaiters(ready: boolean) {
  const waiters = loadWaiters;
  loadWaiters = [];
  waiters.forEach((fn) => fn(ready));
}

/** Load a full-screen ad in the background. Safe to call more than once. */
export function preloadInterstitial(): void {
  if (Platform.OS === 'web' || loading || loadedAd) return;
  loading = true;
  void (async () => {
    try {
      const { InterstitialAd, AdEventType } = await import(
        'react-native-google-mobile-ads'
      );
      const interstitial = InterstitialAd.createForAdRequest(
        AD_UNITS.interstitial,
        { requestNonPersonalizedAdsOnly: true },
      );
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = (ready: boolean) => {
          if (settled) return;
          settled = true;
          unsubLoaded();
          unsubError();
          if (ready) loadedAd = interstitial;
          resolve();
        };
        const unsubLoaded = interstitial.addAdEventListener(
          AdEventType.LOADED,
          () => finish(true),
        );
        const unsubError = interstitial.addAdEventListener(
          AdEventType.ERROR,
          () => finish(false),
        );
        interstitial.load();
        setTimeout(() => finish(false), 8000);
      });
    } catch {
      loadedAd = null;
    } finally {
      loading = false;
      notifyWaiters(Boolean(loadedAd));
    }
  })();
}

function waitForPreload(ms: number): Promise<boolean> {
  if (loadedAd) return Promise.resolve(true);
  if (!loading) return Promise.resolve(false);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(Boolean(loadedAd)), ms);
    loadWaiters.push((ready) => {
      clearTimeout(timer);
      resolve(ready);
    });
  });
}

/**
 * One full-screen ad per process (cold start / force-close then reopen).
 * Does not show when the app is only backgrounded. Never blocks the UI.
 */
export async function showLaunchInterstitial(): Promise<void> {
  if (Platform.OS === 'web' || shownThisProcess) return;
  shownThisProcess = true;
  try {
    if (!loadedAd) preloadInterstitial();
    const ready = loadedAd ? true : await waitForPreload(2500);
    if (!ready || !loadedAd) return;
    const ad = loadedAd;
    loadedAd = null;
    await ad.show();
  } catch {
    // Ads must never block reminders.
  }
}
