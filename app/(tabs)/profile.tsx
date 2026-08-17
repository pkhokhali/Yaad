import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { brand, colors, radii, spacing } from '@/constants/theme';
import { useYaadItemStore } from '@/store/useYaadItemStore';

export default function ProfileScreen() {
  const router = useRouter();
  const streak = useYaadItemStore((s) => s.streak);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <MemoryNodeIcon size={56} />
          <Text style={styles.name}>Yaad</Text>
          <Text style={styles.motto}>{brand.motto}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Local-first</Text>
          <Text style={styles.cardBody}>
            No sign-in. No cloud. Everything stays on this phone — perfect when
            a family member sets up medicine reminders during a visit.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>{streak} days</Text>
          <Text style={styles.statHint}>Saved on this device only</Text>
        </View>

        <Pressable
          style={styles.btn}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Text style={styles.btnText}>App settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  name: { fontSize: 24, fontWeight: '700', color: colors.text },
  motto: { fontSize: 13, color: colors.accent, marginTop: spacing.sm, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  statHint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
  },
  btn: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: { color: colors.text, fontWeight: '600' },
});
