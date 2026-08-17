import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ReminderCard } from '@/components/ReminderCard';
import { colors, spacing } from '@/constants/theme';
import { filterByBucket } from '@/lib/utils/priority';
import { useYaadItemStore } from '@/store/useYaadItemStore';
import { PriorityBucket } from '@/types/yaad';

type Props = {
  bucket: PriorityBucket;
  emptyTitle: string;
  emptyBody: string;
};

export function YaadBucketList({ bucket, emptyTitle, emptyBody }: Props) {
  const router = useRouter();
  const items = useYaadItemStore((s) => s.items);
  const bucketItems = useMemo(
    () => filterByBucket(items, bucket),
    [items, bucket],
  );
  const reminders = useYaadItemStore((s) => s.reminders);
  const highlightId = useYaadItemStore((s) => s.highlightId);
  const bootstrapping = useYaadItemStore((s) => s.bootstrapping);
  const isRefreshing = useYaadItemStore((s) => s.isRefreshing);
  const storeReady = useYaadItemStore((s) => s.ready);

  const onRefresh = useCallback(() => {
    useYaadItemStore.getState().refresh();
  }, []);

  const reminderById = useCallback(
    (id: string) => reminders.find((r) => r.id === id),
    [reminders],
  );

  if ((!storeReady || bootstrapping) && bucketItems.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={bucketItems}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      onRefresh={onRefresh}
      refreshing={isRefreshing}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyBody}>{emptyBody}</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => router.push('/add')}
          >
            <Text style={styles.addBtnText}>Add reminder</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => {
        const reminder = reminderById(item.id);
        if (!reminder) return null;
        return (
          <ReminderCard
            reminder={reminder}
            highlighted={item.id === highlightId}
            onPress={() => router.push(`/reminder/${item.id}`)}
          />
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  addBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  addBtnText: {
    color: colors.accent,
    fontWeight: '600',
  },
});
