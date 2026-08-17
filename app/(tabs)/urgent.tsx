import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { YaadBucketList } from '@/components/YaadBucketList';
import { YaadTabShell } from '@/components/YaadTabShell';
import { useYaadItemStore } from '@/store/useYaadItemStore';

export default function UrgentScreen() {
  useFocusEffect(
    useCallback(() => {
      if (!useYaadItemStore.getState().ready) return;
      useYaadItemStore.getState().refresh();
    }, []),
  );

  return (
    <YaadTabShell title="Urgent" subtitle="Overdue or due within hours">
      <View style={styles.flex}>
        <YaadBucketList
          bucket="Urgent"
          emptyTitle="All clear"
          emptyBody="Overdue or due-soon reminders show up here."
        />
      </View>
    </YaadTabShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
