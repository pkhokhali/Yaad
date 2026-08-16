import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { colors } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';

export default function TabLayout() {
  const { insets, tabBarHeight, isCompact } = useResponsive();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: isCompact ? 2 : 4,
          },
        ],
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: isCompact ? { marginTop: 0 } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.borderHairline,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
