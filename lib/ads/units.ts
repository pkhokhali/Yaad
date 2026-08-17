/**
 * AdMob units. Android production IDs are live.
 * iOS still uses Google test app ID until an iOS AdMob app is created.
 */
export const USE_TEST_ADS = false;

export const PRODUCTION_ANDROID_APP_ID = 'ca-app-pub-5729640735270473~7390242681';
export const PRODUCTION_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

export const PRODUCTION_UNITS = {
  banner: 'ca-app-pub-5729640735270473/1712208890',
  interstitial: 'ca-app-pub-5729640735270473/4781175036',
};

export const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

export const TEST_UNITS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
};

export const AD_UNITS = USE_TEST_ADS ? TEST_UNITS : PRODUCTION_UNITS;
