const {
  withAndroidManifest,
  AndroidConfig,
} = require('expo/config-plugins');

const PERMISSIONS = [
  'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.WAKE_LOCK',
];

function withYaadAlerts(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    PERMISSIONS.forEach((name) => {
      AndroidConfig.Permissions.addPermission(manifest, name);
    });
    return mod;
  });
  return config;
}

module.exports = withYaadAlerts;
