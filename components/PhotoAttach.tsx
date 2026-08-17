import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
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
  const { colors } = useTheme();
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
        <Image source={{ uri }} style={[styles.preview, { backgroundColor: colors.surfaceElevated }]} />
        <Text style={[styles.change, { color: colors.textMuted }]}>Tap to change</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={pick} style={[styles.empty, { borderColor: colors.accent, backgroundColor: colors.accentSoft }]} accessibilityLabel={prompt}>
      <Ionicons name="camera" size={22} color={colors.accent} />
      <Text style={[styles.emptyText, { color: colors.accent }]}>{prompt}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.lg,
  },
  emptyText: {
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
  },
  change: {
    fontSize: 13,
  },
});
