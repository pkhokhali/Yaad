import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { AD_UNITS } from '@/lib/ads/units';

type Props = {
  onHeight?: (height: number) => void;
};

export function AdBanner({ onHeight }: Props) {
  const [failed, setFailed] = useState(false);
  const { width, isCompact } = useResponsive();
  const hidden = Platform.OS === 'web' || failed;

  useEffect(() => {
    if (hidden) onHeight?.(0);
  }, [hidden, onHeight]);

  if (hidden) return null;

  try {
    const {
      BannerAd,
      BannerAdSize,
    } = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');

    const size =
      width >= 728
        ? BannerAdSize.LEADERBOARD
        : width >= 468
          ? BannerAdSize.FULL_BANNER
          : isCompact
            ? BannerAdSize.BANNER
            : BannerAdSize.ANCHORED_ADAPTIVE_BANNER;

    return (
      <View
        style={styles.wrap}
        onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      >
        <BannerAd
          unitId={AD_UNITS.banner}
          size={size}
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
    width: '100%',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});
