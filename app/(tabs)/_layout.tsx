import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useCopy } from '@/lib/i18n/copy';
import { openGuidedVoiceCapture } from '@/lib/services/voiceCapture';
import { useResponsive } from '@/hooks/useResponsive';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function TabLayout() {
  const { insets, tabBarHeight, isCompact } = useResponsive();
  const { colors } = useTheme();
  const { scale } = useScale();
  const copy = useCopy();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navActive,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderHairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: isCompact ? 2 : 4,
        },
        tabBarLabelStyle: {
          fontSize: scale.meta - 2,
          fontWeight: '600',
        },
        tabBarIconStyle: isCompact ? { marginTop: 0 } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: copy.tabs.dashboard,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: copy.tabs.todo,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: copy.tabs.voice,
          tabBarActiveTintColor: colors.accent,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" size={size + 2} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            openGuidedVoiceCapture();
          },
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: copy.tabs.reminders,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expense"
        options={{
          title: copy.tabs.expense,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: copy.tabs.settings,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
