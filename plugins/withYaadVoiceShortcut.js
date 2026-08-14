const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE = 'com.pkhokhali.yaad';

const SHORTCUTS_XML = `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut
    android:shortcutId="voice_reminder"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_voice_short"
    android:shortcutLongLabel="@string/shortcut_voice_long">
    <intent
      android:action="android.intent.action.VIEW"
      android:targetPackage="${PACKAGE}"
      android:targetClass="${PACKAGE}.MainActivity"
      android:data="yaad://capture?voice=1" />
  </shortcut>
  <shortcut
    android:shortcutId="add_reminder"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/shortcut_add_short"
    android:shortcutLongLabel="@string/shortcut_add_long">
    <intent
      android:action="android.intent.action.VIEW"
      android:targetPackage="${PACKAGE}"
      android:targetClass="${PACKAGE}.MainActivity"
      android:data="yaad://add?voice=1" />
  </shortcut>
</shortcuts>`;

/** Google Assistant App Actions → yaad:// deep links */
const ACTIONS_XML = `<?xml version="1.0" encoding="utf-8"?>
<actions>
  <action intentName="actions.intent.CREATE_THING">
    <fulfillment urlTemplate="yaad://add?voice=1&amp;draft={thing.name}">
      <parameter-mapping
        intentParameter="thing.name"
        urlParameter="draft" />
    </fulfillment>
  </action>
  <action intentName="actions.intent.OPEN_APP_FEATURE">
    <fulfillment urlTemplate="yaad://capture?voice=1" />
  </action>
</actions>`;

const STRING_ENTRIES = {
  shortcut_voice_short: 'Voice reminder',
  shortcut_voice_long: 'Add a reminder by voice',
  shortcut_add_short: 'Add reminder',
  shortcut_add_long: 'Speak or type a new reminder',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function mergeStringsXml(valuesDir) {
  const stringsPath = path.join(valuesDir, 'strings.xml');
  let content = fs.existsSync(stringsPath)
    ? fs.readFileSync(stringsPath, 'utf8')
    : '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>';

  for (const [name, value] of Object.entries(STRING_ENTRIES)) {
    if (content.includes(`name="${name}"`)) continue;
    content = content.replace(
      '</resources>',
      `  <string name="${name}">${value}</string>\n</resources>`,
    );
  }

  fs.writeFileSync(stringsPath, content);
}

function withYaadVoiceShortcut(config) {
  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const resRoot = path.join(
        mod.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
      );
      const xmlDir = path.join(resRoot, 'xml');
      const valuesDir = path.join(resRoot, 'values');

      ensureDir(xmlDir);
      ensureDir(valuesDir);

      fs.writeFileSync(path.join(xmlDir, 'shortcuts.xml'), SHORTCUTS_XML);
      fs.writeFileSync(path.join(xmlDir, 'actions.xml'), ACTIONS_XML);
      mergeStringsXml(valuesDir);

      return mod;
    },
  ]);

  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);

    mainActivity['meta-data'] = mainActivity['meta-data'] ?? [];
    const entries = mainActivity['meta-data'];

    const addMeta = (name, resource) => {
      if (entries.some((m) => m.$?.['android:name'] === name)) return;
      entries.push({
        $: {
          'android:name': name,
          'android:resource': resource,
        },
      });
    };

    addMeta('android.app.shortcuts', '@xml/shortcuts');
    addMeta('com.google.android.actions', '@xml/actions');

    return mod;
  });

  return config;
}

module.exports = withYaadVoiceShortcut;
