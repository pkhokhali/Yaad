import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AD_UNITS } from '@/lib/ads/units';

type Props = {
  onHeight?: (height: number) => void;
};

/** Compact banner. Never place next to the mic / CaptureBar. */
export function AdBanner({ onHeight }: Props) {
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const { colors } = useTheme();
  const hidden = Platform.OS === 'web' || failed;

  useEffect(() => {
    if (hidden) onHeight?.(0);
  }, [hidden, onHeight]);

  const Banner = useMemo(() => {
    if (Platform.OS === 'web') return null;
    try {
      return require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');
    } catch {
      return null;
    }
  }, []);

  if (hidden || !Banner) return null;

  const { BannerAd, BannerAdSize } = Banner;
  const size =
    BannerAdSize.ANCHORED_ADAPTIVE_BANNER ?? BannerAdSize.BANNER;

  return (
    <View
      key={nonce}
      style={[styles.wrap, { backgroundColor: colors.surface }]}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      pointerEvents="box-none"
    >
      <BannerAd
        unitId={AD_UNITS.banner}
        size={size}
        onAdFailedToLoad={() => {
          if (nonce < 3) {
            setTimeout(() => setNonce((n) => n + 1), 4000);
            return;
          }
          setFailed(true);
        }}
      />
    </View>
  );
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
