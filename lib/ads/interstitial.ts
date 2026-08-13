import { Platform } from 'react-native';

import { AD_UNITS } from '@/lib/ads/units';

let loading = false;

/** Ready for later: call this when you want a full-screen ad. */
export async function showInterstitial(): Promise<void> {
  if (Platform.OS === 'web' || loading) return;
  loading = true;
  try {
    const { InterstitialAd, AdEventType } = await import(
      'react-native-google-mobile-ads'
    );
    const interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    });
    await new Promise<void>((resolve) => {
      const done = () => {
        unsub();
        resolve();
      };
      const unsub = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        interstitial.show().finally(done);
      });
      interstitial.addAdEventListener(AdEventType.ERROR, done);
      interstitial.load();
      setTimeout(done, 8000);
    });
  } catch {
    // Ignore — ads must never block the reminder flow.
  } finally {
    loading = false;
  }
}
