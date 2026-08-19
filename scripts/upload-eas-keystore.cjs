#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const toolsDir = path.join(__dirname, '.eas-cli-tool');

function getEasCliRoot() {
  try {
    return path.dirname(require.resolve('eas-cli/package.json'));
  } catch {
    // eas-cli is not a runtime dependency; install on demand for credential upload.
    if (!fs.existsSync(path.join(toolsDir, 'node_modules', 'eas-cli', 'package.json'))) {
      fs.mkdirSync(toolsDir, { recursive: true });
      execSync('npm install eas-cli@21.8.0 --no-save --prefix .', {
        cwd: toolsDir,
        stdio: 'inherit',
      });
    }
    return path.join(toolsDir, 'node_modules', 'eas-cli');
  }
}

const easRoot = getEasCliRoot();
const { readAndroidCredentialsAsync } = require(path.join(
  easRoot,
  'build/credentials/credentialsJson/read',
));
const {
  getKeystoreWithType,
  validateKeystore,
} = require(path.join(easRoot, 'build/credentials/android/utils/keystoreNew'));
const androidApi = require(path.join(easRoot, 'build/credentials/android/api/GraphqlClient'));
const { getOwnerAccountForProjectIdAsync } = require(path.join(
  easRoot,
  'build/project/projectUtils',
));
const SessionManager = require(path.join(easRoot, 'build/user/SessionManager')).default;
const {
  createGraphqlClient,
} = require(path.join(easRoot, 'build/commandUtils/context/contextUtils/createGraphqlClient'));
const { createAnalyticsAsync } = require(path.join(
  easRoot,
  'build/analytics/AnalyticsManager',
));

async function main() {
  const projectDir = path.join(__dirname, '..');
  const appJson = require(path.join(projectDir, 'app.json'));
  const projectId = appJson.expo.extra?.eas?.projectId;
  const slug = appJson.expo.slug;
  const packageName = appJson.expo.android?.package;
  const profileName = process.argv[2] || 'production';

  if (!projectId) {
    throw new Error('Missing expo.extra.eas.projectId — run: npx eas-cli init');
  }
  if (!packageName) {
    throw new Error('Missing expo.android.package in app.json');
  }

  const analytics = await createAnalyticsAsync();
  const sessionManager = new SessionManager(analytics);
  const { authenticationInfo } = await sessionManager.ensureLoggedInAsync({
    nonInteractive: true,
  });
  const graphqlClient = createGraphqlClient(authenticationInfo);

  const account = await getOwnerAccountForProjectIdAsync(graphqlClient, projectId);
  const appLookupParams = {
    account,
    projectName: slug,
    androidApplicationIdentifier: packageName,
  };

  console.log('Reading credentials.json...');
  const localCredentials = await readAndroidCredentialsAsync(projectDir);
  const keystore = getKeystoreWithType(localCredentials.keystore);
  validateKeystore(keystore);

  console.log('Uploading Play upload keystore to expo.dev (EAS)...');
  const keystoreFragment = await androidApi.createKeystoreAsync(
    graphqlClient,
    account,
    keystore,
  );

  console.log(`Linking keystore to Android build profile "${profileName}"...`);
  await androidApi.createOrUpdateAndroidAppBuildCredentialsByNameAsync(
    graphqlClient,
    appLookupParams,
    profileName,
    { androidKeystoreId: keystoreFragment.id },
  );

  console.log('');
  console.log('Upload key stored on Expo.');
  console.log(`Project: @${account.name}/${slug}`);
  console.log(`View: https://expo.dev/accounts/${account.name}/projects/${slug}/credentials`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
