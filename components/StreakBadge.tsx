import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = { count: number };

export function StreakBadge({ count }: Props) {
  const { colors } = useTheme();
  if (count <= 0) return null;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      accessibilityLabel={`${count} day streak`}
    >
      <Ionicons name="flame" size={14} color={colors.streak} />
      <Text style={[styles.count, { color: colors.text }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
  },
});
