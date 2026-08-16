import { useMemo } from 'react';
import { PixelRatio, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_WIDTH = 390;
const TABLET_SHORTEST = 600;
const COMPACT_WIDTH = 360;
const CONTENT_MAX_WIDTH = 640;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const shortest = Math.min(width, height);
    const isTablet = shortest >= TABLET_SHORTEST;
    const isCompact = width < COMPACT_WIDTH;
    const isLandscape = width > height;
    const raw = width / BASE_WIDTH;
    const scale = Math.min(
      isTablet ? 1.06 : 1.12,
      Math.max(0.86, isTablet ? 1 : raw),
    );
    const s = (n: number) =>
      Math.round(PixelRatio.roundToNearestPixel(n * scale));
    const gutter = isTablet ? 28 : isCompact ? 12 : 16;
    const tabBarHeight = isCompact ? 52 : 58;
    const fabSize = s(56);

    return {
      width,
      height,
      insets,
      isTablet,
      isCompact,
      isLandscape,
      scale,
      s,
      gutter,
      contentMaxWidth: isTablet ? CONTENT_MAX_WIDTH : width,
      tabBarHeight,
      fabSize,
      columnStyle: {
        width: '100%' as const,
        maxWidth: isTablet ? CONTENT_MAX_WIDTH : undefined,
        alignSelf: 'center' as const,
        flexGrow: 1,
        flexShrink: 1,
      },
    };
  }, [width, height, insets]);
}
