import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  type BannerAdProps,
} from 'react-native-google-mobile-ads';

import { ensureAdsReady, whenAdsReady } from '@/lib/ads/init';
import { AD_UNITS } from '@/lib/ads/units';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  onHeight?: (height: number) => void;
};

/** Compact banner. Never place next to the mic / CaptureBar. */
export function AdBanner({ onHeight }: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const hidden = Platform.OS === 'web';

  useEffect(() => {
    whenAdsReady().then(setSdkReady);
  }, []);

  useEffect(() => {
    if (!sdkReady) {
      ensureAdsReady().then(setSdkReady);
    }
  }, [sdkReady]);

  useEffect(() => {
    if (hidden || !loaded) onHeight?.(0);
  }, [hidden, loaded, onHeight]);

  if (hidden || !sdkReady) return null;

  const size: BannerAdProps['size'] =
    width >= 728 ? BannerAdSize.LEADERBOARD : BannerAdSize.BANNER;

  return (
    <View
      key={nonce}
      style={[styles.wrap, { backgroundColor: colors.surface }]}
      onLayout={(e) => {
        if (loaded) onHeight?.(e.nativeEvent.layout.height);
      }}
      pointerEvents="box-none"
    >
      <BannerAd
        unitId={AD_UNITS.banner}
        size={size}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={(error) => {
          setLoaded(false);
          if (__DEV__) {
            console.warn('[AdBanner] failed to load', error);
          }
          setTimeout(() => setNonce((n) => n + 1), Math.min(30_000, 5000 + nonce * 2000));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
});
