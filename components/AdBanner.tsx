import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AD_UNITS } from '@/lib/ads/units';

export function AdBanner() {
  const [failed, setFailed] = useState(false);

  if (Platform.OS === 'web' || failed) return null;

  try {
    const {
      BannerAd,
      BannerAdSize,
    } = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');

    return (
      <View style={styles.wrap}>
        <BannerAd
          unitId={AD_UNITS.banner}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={() => setFailed(true)}
        />
      </View>
    );
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});
