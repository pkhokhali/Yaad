import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { YaadBucketList } from '@/components/YaadBucketList';
import { YaadTabShell } from '@/components/YaadTabShell';
import { useYaadItemStore } from '@/store/useYaadItemStore';

export default function UpcomingScreen() {
  useFocusEffect(
    useCallback(() => {
      if (!useYaadItemStore.getState().ready) return;
      useYaadItemStore.getState().refresh();
    }, []),
  );

  return (
    <YaadTabShell title="Upcoming" subtitle="Due in the next 7 days">
      <View style={styles.flex}>
        <YaadBucketList
          bucket="Upcoming"
          emptyTitle="Nothing upcoming"
          emptyBody="Reminders due in the next 7 days appear here."
        />
      </View>
    </YaadTabShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
