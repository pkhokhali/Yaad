import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AppSettings, DEFAULT_SETTINGS, ScaleMode, ThemeName, UrgencyCurve, VoiceLanguage } from '@/types';

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
  setAppearanceTheme: (appearanceTheme: ThemeName) => void;
  setAppearanceScale: (appearanceScale: ScaleMode) => void;
  completeOnboarding: (setupFor: 'me' | 'family') => void;
  getSettings: () => AppSettings;
};

function clampAlerts(count: number): number {
  if (!Number.isFinite(count)) return 1;
  const rounded = Math.round(count);
  if (rounded > 2) return 2;
  return Math.max(0, Math.min(2, rounded));
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
    appearanceTheme: s.appearanceTheme ?? DEFAULT_SETTINGS.appearanceTheme,
    appearanceScale: s.appearanceScale ?? DEFAULT_SETTINGS.appearanceScale,
    onboardingComplete: Boolean(s.onboardingComplete),
    setupFor: s.setupFor ?? null,
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
      setAppearanceTheme: (appearanceTheme) => set({ appearanceTheme }),
      setAppearanceScale: (appearanceScale) => set({ appearanceScale }),
      completeOnboarding: (setupFor) =>
        set({
          onboardingComplete: true,
          setupFor,
          appearanceScale: setupFor === 'family' ? 'comfort' : 'standard',
        }),
      getSettings: () => snapshot(get()),
    }),
    {
      name: 'yaad-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          queueMicrotask(() =>
            useSettingsStore.setState({ hydrated: true }),
          );
          return;
        }
        state.hydrated = true;
        if (!state.voiceLanguage) {
          state.voiceLanguage = DEFAULT_SETTINGS.voiceLanguage;
        }
        if (state.speakAlerts == null) {
          state.speakAlerts = DEFAULT_SETTINGS.speakAlerts;
        }
        if (state.alertsBeforeDeadline == null || state.alertsBeforeDeadline > 2) {
          state.alertsBeforeDeadline = DEFAULT_SETTINGS.alertsBeforeDeadline;
        }
        if (state.appearanceTheme !== 'normal' && state.appearanceTheme !== 'dark') {
          state.appearanceTheme = DEFAULT_SETTINGS.appearanceTheme;
        }
        if (state.appearanceScale !== 'comfort' && state.appearanceScale !== 'standard') {
          state.appearanceScale = DEFAULT_SETTINGS.appearanceScale;
        }
        if (state.onboardingComplete == null) {
          state.onboardingComplete = false;
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
        appearanceTheme: state.appearanceTheme,
        appearanceScale: state.appearanceScale,
        onboardingComplete: state.onboardingComplete,
        setupFor: state.setupFor,
      }),
    },
  ),
);
