import { Platform } from 'react-native';

export async function initializeAds(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { default: mobileAds } = await import('react-native-google-mobile-ads');
    await mobileAds().initialize();
  } catch {
    // Native module is missing in Expo Go; a real APK has it.
  }
}
