import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { MemorySplash } from '@/components/MemorySplash';
import { colors } from '@/constants/theme';
import { initializeAds } from '@/lib/ads/init';
import { getDatabase } from '@/lib/db/database';
import {
  attachDueSpeechOnForeground,
  handleNotificationResponse,
  speakForReceivedNotification,
} from '@/lib/services/notificationActions';
import { ensureNotificationPermissions } from '@/lib/services/notifications';
import { useReminderStore } from '@/store/useReminderStore';

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
        // Fires when Yaad is already open (foreground). Speaks the action aloud.
        speakForReceivedNotification(notification);
      },
    );

    const detachForeground = attachDueSpeechOnForeground();

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
    };
  }, []);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const bootstrap = useReminderStore((s) => s.bootstrap);
  useNotificationBridge();

  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        await ensureNotificationPermissions();
        await initializeAds();
        await bootstrap();
      } finally {
        setReady(true);
      }
    })();
  }, [bootstrap]);

  if (!ready || !splashDone) {
    return <MemorySplash ready={ready} onFinished={() => setSplashDone(true)} />;
  }

  return (
    <>
      <StatusBar style="dark" />
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
          name="add"
          options={{
            presentation: 'modal',
            title: 'New reminder',
          }}
        />
        <Stack.Screen
          name="reminder/[id]"
          options={{ title: 'Reminder' }}
        />
      </Stack>
    </>
  );
}
