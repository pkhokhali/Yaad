import { Pressable, StyleSheet, View } from 'react-native';

import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { colors, radii, spacing } from '@/constants/theme';
import { openVoiceCapture } from '@/lib/services/voiceCapture';

type Props = {
  onPress?: () => void;
};

export function MemoryNodeFab({ onPress }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        onPress={onPress ?? (() => openVoiceCapture())}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        accessibilityLabel="Add reminder by voice"
        accessibilityRole="button"
      >
        <MemoryNodeIcon size={28} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    zIndex: 10,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: radii.fab,
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
