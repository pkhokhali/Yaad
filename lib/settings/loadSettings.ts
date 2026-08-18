import AsyncStorage from '@react-native-async-storage/async-storage';

import { clampAlertCount } from '@/lib/care/alerts';
import { AppSettings, DEFAULT_SETTINGS } from '@/types';

/** Load settings in headless / background contexts where zustand may not be hydrated. */
export async function loadPersistedSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem('yaad-settings');
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as { state?: Partial<AppSettings> };
    const state = parsed.state ?? (parsed as Partial<AppSettings>);
    return {
      ...DEFAULT_SETTINGS,
      ...state,
      alertsBeforeCount: clampAlertCount(
        state.alertsBeforeCount ?? DEFAULT_SETTINGS.alertsBeforeCount,
      ),
      alertsAfterCount: clampAlertCount(
        state.alertsAfterCount ?? DEFAULT_SETTINGS.alertsAfterCount,
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
