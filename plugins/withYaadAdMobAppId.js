const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/** Yaad production AdMob app ID — must match lib/ads/units.ts and app.json. */
const YAAD_ANDROID_APP_ID = 'ca-app-pub-5729640735270473~7390242681';

const AD_PERMISSIONS = [
  'android.permission.ACCESS_NETWORK_STATE',
  'com.google.android.gms.permission.AD_ID',
];

function setAdMobAppId(manifest, appId) {
  AndroidConfig.Manifest.ensureToolsAvailable(manifest);
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  application['meta-data'] = application['meta-data'] ?? [];

  const name = 'com.google.android.gms.ads.APPLICATION_ID';
  const existing = application['meta-data'].find((item) => item.$['android:name'] === name);
  if (existing) {
    existing.$['android:value'] = appId;
    existing.$['tools:replace'] = 'android:value';
  } else {
    application['meta-data'].push({
      $: {
        'android:name': name,
        'android:value': appId,
        'tools:replace': 'android:value',
      },
    });
  }
}

function ensurePermissions(manifest) {
  const root = manifest.manifest;
  root['uses-permission'] = root['uses-permission'] ?? [];
  for (const perm of AD_PERMISSIONS) {
    const exists = root['uses-permission'].some((item) => item.$?.['android:name'] === perm);
    if (!exists) {
      root['uses-permission'].push({ $: { 'android:name': perm } });
    }
  }
}

/** Force production AdMob app ID and ad-related Android permissions. */
function withYaadAdMobAppId(config) {
  return withAndroidManifest(config, (mod) => {
    ensurePermissions(mod.modResults);
    setAdMobAppId(mod.modResults, YAAD_ANDROID_APP_ID);
    return mod;
  });
}

module.exports = withYaadAdMobAppId;
