import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MemorySplash } from '@/components/MemorySplash';
import OnboardingScreen from './onboarding';
import { initializeAds } from '@/lib/ads/init';
import { preloadInterstitial } from '@/lib/ads/interstitial';
import { maybeShowLaunchAd } from '@/lib/ads/launch';
import { getDatabase } from '@/lib/db/database';
import { attachYaadDeepLinkListener } from '@/lib/services/deepLinks';
import {
  attachDueSpeechOnForeground,
  handleNotificationResponse,
  speakForReceivedNotification,
} from '@/lib/services/notificationActions';
import { ensureNotificationPermissions } from '@/lib/services/notifications';
import { registerBackgroundNotificationTask } from '@/lib/tasks/backgroundNotificationTask';
import { ScaleProvider } from '@/providers/ScaleProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useYaadItemStore } from '@/store/useYaadItemStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function useNotificationBridge() {
  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response).catch(() => undefined);
      },
    );

    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        speakForReceivedNotification(notification);
      },
    );

    const detachForeground = attachDueSpeechOnForeground();
    const detachDeepLinks = attachYaadDeepLinkListener();

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const raw = response.notification.date;
      const ts = raw < 1e12 ? raw * 1000 : raw;
      if (Date.now() - ts < 12_000) {
        handleNotificationResponse(response).catch(() => undefined);
      }
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
      detachForeground();
      detachDeepLinks();
    };
  }, []);
}

function RootLayoutInner() {
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const bootStarted = useRef(false);
  const { colors, theme } = useTheme();
  const hydrated = useSettingsStore((s) => s.hydrated);
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete);
  useNotificationBridge();

  useEffect(() => {
    const finish = () => useSettingsStore.setState({ hydrated: true });
    const unsub = useSettingsStore.persist.onFinishHydration(finish);
    if (useSettingsStore.persist.hasHydrated()) finish();
    return unsub;
  }, []);

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    (async () => {
      try {
        await getDatabase();
        await ensureNotificationPermissions();
        await registerBackgroundNotificationTask();
        await initializeAds();
        preloadInterstitial();
        await useYaadItemStore.getState().bootstrap();
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const onSplashFinished = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    if (!ready || !splashDone || !onboardingComplete) return;
    maybeShowLaunchAd().catch(() => undefined);
  }, [ready, splashDone, onboardingComplete]);

  const status = theme === 'normal' ? 'dark' : 'light';

  if (!hydrated) {
    return null;
  }

  if (!ready || !splashDone) {
    return (
      <>
        <StatusBar style={status} />
        <MemorySplash ready={ready} onFinished={onSplashFinished} />
      </>
    );
  }

  if (!onboardingComplete) {
    return (
      <>
        <StatusBar style={status} />
        <OnboardingScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style={status} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: 'none' }}
        />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
            title: 'New reminder',
          }}
        />
        <Stack.Screen
          name="capture"
          options={{
            presentation: 'modal',
            title: 'Voice capture',
            headerShown: false,
          }}
        />
        <Stack.Screen name="reminder/[id]" options={{ title: 'Reminder' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ScaleProvider>
        <RootLayoutInner />
      </ScaleProvider>
    </ThemeProvider>
  );
}
