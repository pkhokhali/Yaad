/**
 * AdMob units. Using Google’s official test IDs until you paste production ones.
 * Swap the PRODUCTION_* values, then set USE_TEST_ADS to false.
 */
export const USE_TEST_ADS = true;

export const PRODUCTION_ANDROID_APP_ID = 'ca-app-pub-xxxxxxxx~xxxxxxxx';
export const PRODUCTION_IOS_APP_ID = 'ca-app-pub-xxxxxxxx~xxxxxxxx';

export const PRODUCTION_UNITS = {
  banner: 'ca-app-pub-xxxxxxxx/xxxxxxxx',
  interstitial: 'ca-app-pub-xxxxxxxx/xxxxxxxx',
};

export const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

export const TEST_UNITS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
};

export const AD_UNITS = USE_TEST_ADS ? TEST_UNITS : PRODUCTION_UNITS;
