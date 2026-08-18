import { Platform } from 'react-native';

let initPromise: Promise<boolean> | null = null;

async function initializeAdsInternal(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const ads = await import('react-native-google-mobile-ads');
    try {
      await ads.default().setRequestConfiguration({
        maxAdContentRating: ads.MaxAdContentRating.PG,
      });
    } catch {
      // Configuration is optional; still initialize.
    }
    await ads.default().initialize();
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[ads] initialize failed — rebuild with a dev/release APK, not Expo Go', error);
    }
    return false;
  }
}

/** Resolves when the Mobile Ads SDK is ready (or failed). Safe to call repeatedly. */
export function whenAdsReady(): Promise<boolean> {
  initPromise ??= initializeAdsInternal();
  return initPromise;
}

export async function initializeAds(): Promise<void> {
  await whenAdsReady();
}
