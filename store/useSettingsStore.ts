import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AppSettings, DEFAULT_SETTINGS, UrgencyCurve, VoiceLanguage } from '@/types';

type SettingsState = AppSettings & {
  hydrated: boolean;
  quietHoursVersion: number;
  setQuietHours: (start: number, end: number) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setDefaultUrgencyCurve: (curve: UrgencyCurve) => void;
  setNotificationSound: (sound: AppSettings['notificationSound']) => void;
  setVoiceLanguage: (voiceLanguage: VoiceLanguage) => void;
  setSpeakAlerts: (speakAlerts: boolean) => void;
  setAlertsBeforeDeadline: (count: number) => void;
  getSettings: () => AppSettings;
};

function clampAlerts(count: number): number {
  return Math.max(0, Math.min(6, Math.round(count)));
}

function snapshot(s: SettingsState): AppSettings {
  return {
    quietHoursStart: s.quietHoursStart,
    quietHoursEnd: s.quietHoursEnd,
    defaultUrgencyCurve: s.defaultUrgencyCurve,
    notificationSound: s.notificationSound,
    quietHoursEnabled: s.quietHoursEnabled,
    voiceLanguage: s.voiceLanguage ?? DEFAULT_SETTINGS.voiceLanguage,
    speakAlerts: s.speakAlerts ?? DEFAULT_SETTINGS.speakAlerts,
    alertsBeforeDeadline: clampAlerts(
      s.alertsBeforeDeadline ?? DEFAULT_SETTINGS.alertsBeforeDeadline,
    ),
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      hydrated: false,
      quietHoursVersion: 2,
      setQuietHours: (quietHoursStart, quietHoursEnd) =>
        set({ quietHoursStart, quietHoursEnd, quietHoursVersion: 2 }),
      setQuietHoursEnabled: (quietHoursEnabled) => set({ quietHoursEnabled }),
      setDefaultUrgencyCurve: (defaultUrgencyCurve) =>
        set({ defaultUrgencyCurve }),
      setNotificationSound: (notificationSound) => set({ notificationSound }),
      setVoiceLanguage: (voiceLanguage) => set({ voiceLanguage }),
      setSpeakAlerts: (speakAlerts) => set({ speakAlerts }),
      setAlertsBeforeDeadline: (count) =>
        set({ alertsBeforeDeadline: clampAlerts(count) }),
      getSettings: () => snapshot(get()),
    }),
    {
      name: 'yaad-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (!state.voiceLanguage) {
          state.voiceLanguage = DEFAULT_SETTINGS.voiceLanguage;
        }
        if (state.speakAlerts == null) {
          state.speakAlerts = DEFAULT_SETTINGS.speakAlerts;
        }
        if (state.alertsBeforeDeadline == null) {
          state.alertsBeforeDeadline = DEFAULT_SETTINGS.alertsBeforeDeadline;
        }
        if (state.quietHoursVersion !== 2) {
          if (state.quietHoursStart <= 23) {
            state.quietHoursStart *= 60;
          }
          if (state.quietHoursEnd <= 23) {
            state.quietHoursEnd *= 60;
          }
          state.quietHoursVersion = 2;
        }
      },
      partialize: (state) => ({
        quietHoursStart: state.quietHoursStart,
        quietHoursEnd: state.quietHoursEnd,
        quietHoursVersion: state.quietHoursVersion,
        defaultUrgencyCurve: state.defaultUrgencyCurve,
        notificationSound: state.notificationSound,
        quietHoursEnabled: state.quietHoursEnabled,
        voiceLanguage: state.voiceLanguage,
        speakAlerts: state.speakAlerts,
        alertsBeforeDeadline: state.alertsBeforeDeadline,
      }),
    },
  ),
);
