import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { getDatabase } from '@/lib/db/database';
import { ensureNotificationPermissions } from '@/lib/services/notifications';
import { useReminderStore } from '@/store/useReminderStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function useNotificationNavigation() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const reminderId = response.notification.request.content.data
          ?.reminderId as string | undefined;
        if (reminderId) {
          router.push(`/reminder/${reminderId}`);
        }
      },
    );
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const bootstrap = useReminderStore((s) => s.bootstrap);
  useNotificationNavigation();

  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        await ensureNotificationPermissions();
        await bootstrap();
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    })();
  }, [bootstrap]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
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
