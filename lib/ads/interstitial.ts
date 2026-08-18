import { Platform } from 'react-native';

import { whenAdsReady } from '@/lib/ads/init';
import { AD_UNITS } from '@/lib/ads/units';

let loading = false;
let shownThisProcess = false;
let loadedAd: {
  show: () => Promise<void>;
} | null = null;
let loadWaiters: Array<(ready: boolean) => void> = [];
let loadAttempts = 0;

function notifyWaiters(ready: boolean) {
  const waiters = loadWaiters;
  loadWaiters = [];
  waiters.forEach((fn) => fn(ready));
}

/** Load a full-screen ad in the background. Safe to call more than once. */
export function preloadInterstitial(): void {
  if (Platform.OS === 'web' || loading || loadedAd) return;
  if (loadAttempts >= 4) return;
  loading = true;
  loadAttempts += 1;
  void (async () => {
    try {
      const ready = await whenAdsReady();
      if (!ready) return;
      const { InterstitialAd, AdEventType } = await import(
        'react-native-google-mobile-ads'
      );
      const interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
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
          (error) => {
            if (__DEV__) {
              console.warn('[Interstitial] load error', error);
            }
            finish(false);
          },
        );
        interstitial.load();
        setTimeout(() => finish(false), 15_000);
      });
    } catch {
      loadedAd = null;
    } finally {
      loading = false;
      notifyWaiters(Boolean(loadedAd));
      if (!loadedAd && loadAttempts < 4) {
        setTimeout(() => preloadInterstitial(), 2500);
      }
    }
  })();
}

function waitForPreload(ms: number): Promise<boolean> {
  if (loadedAd) return Promise.resolve(true);
  if (!loading && !loadedAd) preloadInterstitial();
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
  try {
    if (!loadedAd) preloadInterstitial();
    const ready = loadedAd ? true : await waitForPreload(12_000);
    if (!ready || !loadedAd) return;
    const ad = loadedAd;
    loadedAd = null;
    await ad.show();
    shownThisProcess = true;
  } catch {
    // Ads must never block reminders.
  }
}
