import { Platform } from 'react-native';

export async function initializeAds(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const ads = await import('react-native-google-mobile-ads');
    try {
      await ads.default().setRequestConfiguration({
        maxAdContentRating: ads.MaxAdContentRating.PG,
      });
    } catch {
      // Configuration is optional; still initialize.
    }
    await ads.default().initialize();
  } catch {
    // Native module is missing in Expo Go; a real APK has it.
  }
}
