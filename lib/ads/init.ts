import { Platform } from 'react-native';

export type AdsStatus = {
  ready: boolean;
  error: string | null;
};

let initPromise: Promise<boolean> | null = null;
let status: AdsStatus = { ready: false, error: null };

async function initializeAdsInternal(): Promise<boolean> {
  if (Platform.OS === 'web') {
    status = { ready: false, error: 'web' };
    return false;
  }
  try {
    const ads = await import('react-native-google-mobile-ads');
    try {
      await ads.default().setRequestConfiguration({
        maxAdContentRating: ads.MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
    } catch {
      // Optional.
    }
    await ads.default().initialize();
    status = { ready: true, error: null };
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Mobile Ads SDK failed to initialize';
    status = { ready: false, error: message };
    return false;
  }
}

/** Resolves when the Mobile Ads SDK is ready (or failed). Safe to call repeatedly. */
export function whenAdsReady(): Promise<boolean> {
  initPromise ??= initializeAdsInternal();
  return initPromise;
}

/** Retry init after splash / onboarding (first attempt may run too early). */
export async function ensureAdsReady(): Promise<boolean> {
  if (status.ready) return true;
  initPromise = null;
  return whenAdsReady();
}

export function getAdsStatus(): AdsStatus {
  return status;
}

export async function initializeAds(): Promise<void> {
  await whenAdsReady();
}
