import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  style,
}: Props) {
  const { colors } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.btn,
        {
          backgroundColor: primary ? colors.primaryButton : colors.surface,
          borderColor: primary ? colors.primaryButton : colors.border,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: primary ? '#FFFFFF' : colors.text,
          fontWeight: '700',
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
