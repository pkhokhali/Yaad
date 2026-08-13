import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AppSettings, DEFAULT_SETTINGS, UrgencyCurve, VoiceLanguage } from '@/types';

type SettingsState = AppSettings & {
  hydrated: boolean;
  setQuietHours: (start: number, end: number) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setDefaultUrgencyCurve: (curve: UrgencyCurve) => void;
  setNotificationSound: (sound: AppSettings['notificationSound']) => void;
  setVoiceLanguage: (voiceLanguage: VoiceLanguage) => void;
  setSpeakAlerts: (speakAlerts: boolean) => void;
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
      setVoiceLanguage: (voiceLanguage) => set({ voiceLanguage }),
      setSpeakAlerts: (speakAlerts) => set({ speakAlerts }),
      getSettings: () => {
        const s = get();
        return {
          quietHoursStart: s.quietHoursStart,
          quietHoursEnd: s.quietHoursEnd,
          defaultUrgencyCurve: s.defaultUrgencyCurve,
          notificationSound: s.notificationSound,
          quietHoursEnabled: s.quietHoursEnabled,
          voiceLanguage: s.voiceLanguage ?? DEFAULT_SETTINGS.voiceLanguage,
          speakAlerts: s.speakAlerts ?? DEFAULT_SETTINGS.speakAlerts,
        };
      },
    }),
    {
      name: 'yaad-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          if (!state.voiceLanguage) {
            state.voiceLanguage = DEFAULT_SETTINGS.voiceLanguage;
          }
          if (state.speakAlerts == null) {
            state.speakAlerts = DEFAULT_SETTINGS.speakAlerts;
          }
        }
      },
      partialize: (state) => ({
        quietHoursStart: state.quietHoursStart,
        quietHoursEnd: state.quietHoursEnd,
        defaultUrgencyCurve: state.defaultUrgencyCurve,
        notificationSound: state.notificationSound,
        quietHoursEnabled: state.quietHoursEnabled,
        voiceLanguage: state.voiceLanguage,
        speakAlerts: state.speakAlerts,
      }),
    },
  ),
);
