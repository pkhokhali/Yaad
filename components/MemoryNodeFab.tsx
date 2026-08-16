import { Pressable, StyleSheet, View } from 'react-native';

import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { colors, radii, spacing } from '@/constants/theme';
import { openVoiceCapture } from '@/lib/services/voiceCapture';

type Props = {
  onPress?: () => void;
  size?: number;
  offsetBottom?: number;
  gutter?: number;
};

export function MemoryNodeFab({
  onPress,
  size = 58,
  offsetBottom = 0,
  gutter = spacing.lg,
}: Props) {
  return (
    <View
      style={[
        styles.wrap,
        { right: gutter, bottom: gutter + offsetBottom },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress ?? (() => openVoiceCapture())}
        style={({ pressed }) => [
          styles.fab,
          { width: size, height: size, borderRadius: Math.round(size * 0.31) },
          pressed && styles.pressed,
        ]}
        accessibilityLabel="Add reminder by voice"
        accessibilityRole="button"
      >
        <MemoryNodeIcon size={Math.round(size * 0.48)} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 10,
  },
  fab: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
