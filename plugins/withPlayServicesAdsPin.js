const { withProjectBuildGradle } = require('expo/config-plugins');

/**
 * play-services-ads 25.x is compiled with Kotlin 2.3.
 * Expo 57 ships Kotlin 2.1.20 — skip the metadata check so AdMob still builds.
 */
function withPlayServicesAdsPin(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes('-Xskip-metadata-version-check')) {
      return mod;
    }
    mod.modResults.contents += `

subprojects { subproject ->
  subproject.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    compilerOptions {
      freeCompilerArgs.add("-Xskip-metadata-version-check")
    }
  }
}
`;
    return mod;
  });
}

module.exports = withPlayServicesAdsPin;
