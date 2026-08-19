import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useYaadItemStore } from '@/store/useYaadItemStore';
import { overdue } from '@/lib/dashboard/reminders';

type Props = {
  subtitle?: string;
};

export function AppHeader({ subtitle = 'Local-first reminders' }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const displayName = useSettingsStore((s) => s.displayName?.trim());
  const reminders = useYaadItemStore((s) => s.reminders);
  const alertCount = overdue(reminders).length;

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.borderHairline }]}
        onPress={() => router.push('/(tabs)/settings')}
        accessibilityLabel="Open settings"
      >
        <Ionicons name="menu-outline" size={22} color={colors.text} />
      </Pressable>

      <Pressable
        style={styles.profile}
        onPress={() => router.push('/(tabs)/settings')}
      >
        <View style={[styles.avatar, { backgroundColor: colors.navActive }]}>
          <Text style={styles.avatarText}>
            {(displayName || 'Y').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {displayName || 'Yaad'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle || brand.motto}
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.borderHairline }]}
        onPress={() => router.push('/history')}
        accessibilityLabel={`Notifications, ${alertCount} overdue`}
      >
        <Ionicons name="notifications-outline" size={22} color={colors.text} />
        {alertCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.danger }]}>
            <Text style={styles.badgeText}>
              {alertCount > 99 ? '99+' : alertCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
