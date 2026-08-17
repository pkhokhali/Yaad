import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useCopy } from '@/lib/i18n/copy';
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
        tabBarActiveTintColor: colors.accent,
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
          fontWeight: '500',
        },
        tabBarIconStyle: isCompact ? { marginTop: 0 } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: copy.tabs.today,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="later"
        options={{
          title: copy.tabs.later,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: copy.tabs.me,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
