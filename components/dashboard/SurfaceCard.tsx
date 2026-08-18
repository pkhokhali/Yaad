import { Pressable, StyleSheet, Text, View, ViewProps } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = ViewProps & {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
};

export function SurfaceCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderHairline,
        },
        style,
      ]}
      {...rest}
    >
      {title || subtitle || actionLabel ? (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {title ? (
              <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
            ) : null}
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.textSubtle }]}>{subtitle}</Text>
            ) : null}
          </View>
          {actionLabel && onAction ? (
            <Pressable onPress={onAction}>
              <Text style={[styles.action, { color: colors.navActive }]}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  action: {
    fontSize: 13,
    fontWeight: '600',
  },
});
