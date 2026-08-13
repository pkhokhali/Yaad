import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Props = { count: number };

export function StreakBadge({ count }: Props) {
  if (count <= 0) return null;

  return (
    <View style={styles.badge} accessibilityLabel={`${count} day streak`}>
      <Ionicons name="flame" size={14} color={colors.streak} />
      <Text style={styles.count}>{count}</Text>
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
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
