import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  title: string;
  body: string;
};

export function EmptyPanel({ title, body }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
