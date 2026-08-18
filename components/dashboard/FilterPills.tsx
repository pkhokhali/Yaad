import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.text : colors.surface,
                borderColor: active ? colors.text : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: active ? colors.surface : colors.text,
                fontWeight: active ? '700' : '500',
                fontSize: 13,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
