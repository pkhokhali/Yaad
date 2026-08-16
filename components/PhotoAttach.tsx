import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import {
  chooseReminderPhoto,
  takeReminderPhoto,
} from '@/lib/care/photos';

type Props = {
  uri: string | null;
  onChange: (uri: string | null) => void;
  prompt?: string;
};

export function PhotoAttach({ uri, onChange, prompt = 'Add a photo' }: Props) {
  const pick = () => {
    Alert.alert(prompt, 'A picture of the bottle or box helps you recognise it.', [
      {
        text: 'Take photo',
        onPress: async () => {
          const next = await takeReminderPhoto();
          if (next) onChange(next);
        },
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const next = await chooseReminderPhoto();
          if (next) onChange(next);
        },
      },
      ...(uri
        ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => onChange(null) }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  if (uri) {
    return (
      <Pressable onPress={pick} style={styles.previewWrap} accessibilityLabel="Change photo">
        <Image source={{ uri }} style={styles.preview} />
        <Text style={styles.change}>Tap to change</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={pick} style={styles.empty} accessibilityLabel={prompt}>
      <Ionicons name="camera" size={22} color={colors.accent} />
      <Text style={styles.emptyText}>{prompt}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: {
    marginTop: spacing.md,
    minHeight: 88,
    borderRadius: radii.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
  previewWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 240,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceElevated,
  },
  change: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
