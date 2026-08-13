import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { categoryColors, radii } from '@/constants/theme';
import { Category } from '@/types';

const ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  call: 'call',
  document: 'document-text',
  repeat: 'refresh',
  general: 'bookmark',
};

type Props = {
  category: Category;
  filled?: boolean;
  size?: number;
};

export function CategoryChip({ category, filled = false, size = 34 }: Props) {
  const palette = categoryColors[category] ?? categoryColors.general;
  return (
    <View
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          borderRadius: radii.chip,
          backgroundColor: filled ? palette.tint : palette.soft,
        },
      ]}
    >
      <Ionicons
        name={ICONS[category]}
        size={size * 0.48}
        color={filled ? '#FFFFFF' : palette.tint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
