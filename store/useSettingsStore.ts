import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AppSettings, DEFAULT_SETTINGS, UrgencyCurve } from '@/types';

type SettingsState = AppSettings & {
  hydrated: boolean;
  setQuietHours: (start: number, end: number) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setDefaultUrgencyCurve: (curve: UrgencyCurve) => void;
  setNotificationSound: (sound: AppSettings['notificationSound']) => void;
  getSettings: () => AppSettings;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      hydrated: false,
      setQuietHours: (quietHoursStart, quietHoursEnd) =>
        set({ quietHoursStart, quietHoursEnd }),
      setQuietHoursEnabled: (quietHoursEnabled) => set({ quietHoursEnabled }),
      setDefaultUrgencyCurve: (defaultUrgencyCurve) =>
        set({ defaultUrgencyCurve }),
      setNotificationSound: (notificationSound) => set({ notificationSound }),
      getSettings: () => {
        const s = get();
        return {
          quietHoursStart: s.quietHoursStart,
          quietHoursEnd: s.quietHoursEnd,
          defaultUrgencyCurve: s.defaultUrgencyCurve,
          notificationSound: s.notificationSound,
          quietHoursEnabled: s.quietHoursEnabled,
        };
      },
    }),
    {
      name: 'yaad-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: (state) => ({
        quietHoursStart: state.quietHoursStart,
        quietHoursEnd: state.quietHoursEnd,
        defaultUrgencyCurve: state.defaultUrgencyCurve,
        notificationSound: state.notificationSound,
        quietHoursEnabled: state.quietHoursEnabled,
      }),
    },
  ),
);
