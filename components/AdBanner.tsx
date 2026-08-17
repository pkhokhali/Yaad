import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AD_UNITS } from '@/lib/ads/units';

type Props = {
  onHeight?: (height: number) => void;
};

/** Compact 50pt banner. Never place next to the mic / CaptureBar. */
export function AdBanner({ onHeight }: Props) {
  const [failed, setFailed] = useState(false);
  const { colors } = useTheme();
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

    return (
      <View
        style={[styles.wrap, { backgroundColor: colors.surface }]}
        onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        <BannerAd
          unitId={AD_UNITS.banner}
          size={BannerAdSize.BANNER}
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
    overflow: 'hidden',
  },
});
