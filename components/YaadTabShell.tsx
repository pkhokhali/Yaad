import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MemoryNodeFab } from '@/components/MemoryNodeFab';
import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { StreakBadge } from '@/components/StreakBadge';
import { colors, spacing } from '@/constants/theme';
import { useYaadItemStore } from '@/store/useYaadItemStore';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showFab?: boolean;
};

export function YaadTabShell({
  title,
  subtitle,
  children,
  showFab = true,
}: Props) {
  const router = useRouter();
  const streak = useYaadItemStore((s) => s.streak);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.brand}>Yaad</Text>
        <MemoryNodeIcon size={30} />
        <Pressable onPress={() => router.push('/profile')} hitSlop={12}>
          <Text style={styles.profileLink}>Profile</Text>
        </Pressable>
      </View>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <StreakBadge count={streak} />
      </View>
      <View style={styles.body}>{children}</View>
      {showFab ? <MemoryNodeFab /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    minWidth: 64,
  },
  profileLink: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  body: { flex: 1 },
});
