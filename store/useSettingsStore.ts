import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { clampAlertCount, migrateLegacyAlertStrength } from '@/lib/care/alerts';
import { AppSettings, DEFAULT_SETTINGS, ScaleMode, ThemeName, UiLanguage, UrgencyCurve, VoiceLanguage, CalendarDisplay } from '@/types';

type SettingsState = AppSettings & {
  hydrated: boolean;
  quietHoursVersion: number;
  setQuietHours: (start: number, end: number) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setDefaultUrgencyCurve: (curve: UrgencyCurve) => void;
  setNotificationSound: (sound: AppSettings['notificationSound']) => void;
  setVoiceLanguage: (voiceLanguage: VoiceLanguage) => void;
  setUiLanguage: (uiLanguage: UiLanguage) => void;
  setCalendarDisplay: (calendarDisplay: CalendarDisplay) => void;
  setAllowVoiceOnMobileData: (allowVoiceOnMobileData: boolean) => void;
  setOfflineNepaliDownloadAttemptedAt: (at: number) => void;
  setSpeakAlerts: (speakAlerts: boolean) => void;
  setAlertsBeforeCount: (count: number) => void;
  setAlertsAfterCount: (count: number) => void;
  setAppearanceTheme: (appearanceTheme: ThemeName) => void;
  setAppearanceScale: (appearanceScale: ScaleMode) => void;
  setDisplayName: (displayName: string) => void;
  completeOnboarding: (setupFor: 'me' | 'family') => void;
  getSettings: () => AppSettings;
};

function snapshot(s: SettingsState): AppSettings {
  return {
    quietHoursStart: s.quietHoursStart,
    quietHoursEnd: s.quietHoursEnd,
    defaultUrgencyCurve: s.defaultUrgencyCurve,
    notificationSound: s.notificationSound,
    quietHoursEnabled: s.quietHoursEnabled,
    voiceLanguage: s.voiceLanguage ?? DEFAULT_SETTINGS.voiceLanguage,
    uiLanguage: s.uiLanguage ?? DEFAULT_SETTINGS.uiLanguage,
    calendarDisplay: s.calendarDisplay ?? DEFAULT_SETTINGS.calendarDisplay,
    allowVoiceOnMobileData:
      s.allowVoiceOnMobileData ?? DEFAULT_SETTINGS.allowVoiceOnMobileData,
    offlineNepaliDownloadAttemptedAt:
      s.offlineNepaliDownloadAttemptedAt ??
      DEFAULT_SETTINGS.offlineNepaliDownloadAttemptedAt,
    speakAlerts: s.speakAlerts ?? DEFAULT_SETTINGS.speakAlerts,
    alertsBeforeCount: clampAlertCount(
      s.alertsBeforeCount ?? DEFAULT_SETTINGS.alertsBeforeCount,
    ),
    alertsAfterCount: clampAlertCount(
      s.alertsAfterCount ?? DEFAULT_SETTINGS.alertsAfterCount,
    ),
    appearanceTheme: s.appearanceTheme ?? DEFAULT_SETTINGS.appearanceTheme,
    appearanceScale: s.appearanceScale ?? DEFAULT_SETTINGS.appearanceScale,
    onboardingComplete: Boolean(s.onboardingComplete),
    setupFor: s.setupFor ?? null,
    displayName: s.displayName?.trim() ?? '',
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
      setUiLanguage: (uiLanguage) => set({ uiLanguage }),
      setCalendarDisplay: (calendarDisplay) => set({ calendarDisplay }),
      setAllowVoiceOnMobileData: (allowVoiceOnMobileData) =>
        set({ allowVoiceOnMobileData }),
      setOfflineNepaliDownloadAttemptedAt: (offlineNepaliDownloadAttemptedAt) =>
        set({ offlineNepaliDownloadAttemptedAt }),
      setSpeakAlerts: (speakAlerts) => set({ speakAlerts }),
      setAlertsBeforeCount: (count) =>
        set({ alertsBeforeCount: clampAlertCount(count) }),
      setAlertsAfterCount: (count) =>
        set({ alertsAfterCount: clampAlertCount(count) }),
      setAppearanceTheme: (appearanceTheme) => set({ appearanceTheme }),
      setAppearanceScale: (appearanceScale) => set({ appearanceScale }),
      setDisplayName: (displayName) => set({ displayName: displayName.trim() }),
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
        if (state.uiLanguage !== 'en' && state.uiLanguage !== 'ne') {
          state.uiLanguage =
            state.voiceLanguage === 'ne' || state.voiceLanguage === 'new'
              ? 'ne'
              : 'en';
        }
        if (
          state.calendarDisplay !== 'ad' &&
          state.calendarDisplay !== 'bs' &&
          state.calendarDisplay !== 'both'
        ) {
          state.calendarDisplay = DEFAULT_SETTINGS.calendarDisplay;
        }
        if (state.allowVoiceOnMobileData == null) {
          state.allowVoiceOnMobileData =
            DEFAULT_SETTINGS.allowVoiceOnMobileData;
        }
        if (state.offlineNepaliDownloadAttemptedAt == null) {
          state.offlineNepaliDownloadAttemptedAt = 0;
        }
        if (state.speakAlerts == null) {
          state.speakAlerts = DEFAULT_SETTINGS.speakAlerts;
        }
        if (
          state.alertsBeforeCount == null &&
          state.alertsAfterCount == null &&
          state.alertsBeforeDeadline != null
        ) {
          const migrated = migrateLegacyAlertStrength(state.alertsBeforeDeadline);
          state.alertsBeforeCount = migrated.before;
          state.alertsAfterCount = migrated.after;
        }
        if (state.alertsBeforeCount == null) {
          state.alertsBeforeCount = DEFAULT_SETTINGS.alertsBeforeCount;
        }
        if (state.alertsAfterCount == null) {
          state.alertsAfterCount = DEFAULT_SETTINGS.alertsAfterCount;
        }
        state.alertsBeforeCount = clampAlertCount(state.alertsBeforeCount);
        state.alertsAfterCount = clampAlertCount(state.alertsAfterCount);
        if (state.appearanceTheme !== 'normal' && state.appearanceTheme !== 'dark') {
          state.appearanceTheme = DEFAULT_SETTINGS.appearanceTheme;
        }
        if (state.appearanceScale !== 'comfort' && state.appearanceScale !== 'standard') {
          state.appearanceScale = DEFAULT_SETTINGS.appearanceScale;
        }
        if (state.onboardingComplete == null) {
          state.onboardingComplete = false;
        }
        if (state.displayName == null) {
          state.displayName = DEFAULT_SETTINGS.displayName;
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
        uiLanguage: state.uiLanguage,
        calendarDisplay: state.calendarDisplay,
        allowVoiceOnMobileData: state.allowVoiceOnMobileData,
        offlineNepaliDownloadAttemptedAt:
          state.offlineNepaliDownloadAttemptedAt,
        speakAlerts: state.speakAlerts,
        alertsBeforeCount: state.alertsBeforeCount,
        alertsAfterCount: state.alertsAfterCount,
        appearanceTheme: state.appearanceTheme,
        appearanceScale: state.appearanceScale,
        onboardingComplete: state.onboardingComplete,
        setupFor: state.setupFor,
        displayName: state.displayName,
      }),
    },
  ),
);
