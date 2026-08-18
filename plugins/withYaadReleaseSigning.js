const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING_MARKER = 'yaadReleaseSigning';

function withYaadReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes(SIGNING_MARKER)) {
      return mod;
    }

    if (
      !mod.modResults.contents.includes('keyAlias') ||
      !mod.modResults.contents.includes("'androiddebugkey'")
    ) {
      return mod;
    }

    mod.modResults.contents = mod.modResults.contents.replace(
      `keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`,
      `keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // ${SIGNING_MARKER}
            def yaadPropsFile = rootProject.file("../credentials/keystore.properties")
            if (yaadPropsFile.exists()) {
                def yaadProps = new Properties()
                yaadProps.load(new FileInputStream(yaadPropsFile))
                keyAlias yaadProps['keyAlias']
                keyPassword yaadProps['keyPassword']
                storeFile rootProject.file(yaadProps['storeFile'])
                storePassword yaadProps['storePassword']
            }
        }
    }`,
    );

    mod.modResults.contents = mod.modResults.contents.replace(
      `release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
      `release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            if (rootProject.file("../credentials/keystore.properties").exists()) {
                signingConfig signingConfigs.release
            }`,
    );

    return mod;
  });
}

module.exports = withYaadReleaseSigning;
