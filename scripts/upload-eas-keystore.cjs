#!/usr/bin/env node
'use strict';

const path = require('path');
const { readAndroidCredentialsAsync } = require('eas-cli/build/credentials/credentialsJson/read');
const {
  getKeystoreWithType,
  validateKeystore,
} = require('eas-cli/build/credentials/android/utils/keystoreNew');
const androidApi = require('eas-cli/build/credentials/android/api/GraphqlClient');
const { getOwnerAccountForProjectIdAsync } = require('eas-cli/build/project/projectUtils');
const SessionManager = require('eas-cli/build/user/SessionManager').default;
const { createGraphqlClient } = require('eas-cli/build/commandUtils/context/contextUtils/createGraphqlClient');
const { createAnalyticsAsync } = require('eas-cli/build/analytics/AnalyticsManager');

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
