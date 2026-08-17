import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentColumn } from '@/components/ContentColumn';
import { ReminderCard } from '@/components/ReminderCard';
import { AdBanner } from '@/components/AdBanner';
import { spacing } from '@/constants/theme';
import { useCopy } from '@/lib/i18n/copy';
import { useResponsive } from '@/hooks/useResponsive';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useYaadItemStore } from '@/store/useYaadItemStore';

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export default function LaterScreen() {
  const router = useRouter();
  const { gutter } = useResponsive();
  const { colors } = useTheme();
  const { scale } = useScale();
  const copy = useCopy();
  const reminders = useYaadItemStore((s) => s.reminders);
  const bootstrapping = useYaadItemStore((s) => s.bootstrapping);
  const isRefreshing = useYaadItemStore((s) => s.isRefreshing);
  const storeReady = useYaadItemStore((s) => s.ready);
  const toggleChecklistItem = useYaadItemStore((s) => s.toggleChecklistItem);

  const later = useMemo(() => {
    const end = endOfToday();
    return reminders
      .filter((r) => !r.is_done && r.due_at > end)
      .sort((a, b) => a.due_at - b.due_at);
  }, [reminders]);

  useFocusEffect(
    useCallback(() => {
      if (!useYaadItemStore.getState().ready) return;
      useYaadItemStore.getState().refresh();
    }, []),
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ContentColumn>
        <View style={{ paddingHorizontal: gutter, paddingBottom: spacing.md }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
            {copy.tabs.later}
          </Text>
        </View>
        {!storeReady || (bootstrapping && later.length === 0) ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={later}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: gutter,
              paddingBottom: spacing.lg,
              gap: scale.gap,
              flexGrow: 1,
            }}
            onRefresh={() => useYaadItemStore.getState().refresh()}
            refreshing={isRefreshing}
            ListEmptyComponent={
              <View style={{ marginTop: spacing.xxxl }}>
                <Text
                  style={{
                    fontSize: scale.heroTitle,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: spacing.sm,
                  }}
                >
                  {copy.emptyLaterTitle}
                </Text>
                <Text style={{ fontSize: scale.body, color: colors.textMuted }}>
                  {copy.emptyLaterBody}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <ReminderCard
                reminder={item}
                onPress={() => router.push(`/reminder/${item.id}`)}
                onToggleItem={(index) => toggleChecklistItem(item.id, index)}
              />
            )}
          />
        )}
        <AdBanner />
      </ContentColumn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
