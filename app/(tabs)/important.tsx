import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { YaadBucketList } from '@/components/YaadBucketList';
import { YaadTabShell } from '@/components/YaadTabShell';
import { useYaadItemStore } from '@/store/useYaadItemStore';

export default function ImportantScreen() {
  useFocusEffect(
    useCallback(() => {
      if (!useYaadItemStore.getState().ready) return;
      useYaadItemStore.getState().refresh();
    }, []),
  );

  return (
    <YaadTabShell title="Important" subtitle="Manually flagged items">
      <View style={styles.flex}>
        <YaadBucketList
          bucket="Important"
          emptyTitle="No important items"
          emptyBody="Mark a reminder as important when adding or editing it."
        />
      </View>
    </YaadTabShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
