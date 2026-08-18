import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  listening: boolean;
  receiving: boolean;
  size?: number;
};

function Bar({
  listening,
  receiving,
  delay,
  maxH,
}: {
  listening: boolean;
  receiving: boolean;
  delay: number;
  maxH: number;
}) {
  const h = useSharedValue(6);

  useEffect(() => {
    if (!listening) {
      h.value = withTiming(6, { duration: 180 });
      return;
    }
    const peak = receiving ? maxH : maxH * 0.55;
    h.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(peak, {
            duration: receiving ? 220 : 420,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(8, {
            duration: receiving ? 220 : 420,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, h, listening, maxH, receiving]);

  const style = useAnimatedStyle(() => ({
    height: h.value,
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

/** Pulsing ring + waveform while the mic is open. */
export function VoiceListeningVisual({
  listening,
  receiving,
  size = 112,
}: Props) {
  const { colors } = useTheme();
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.2);

  useEffect(() => {
    if (!listening) {
      pulse.value = withTiming(1, { duration: 200 });
      glow.value = withTiming(0.15, { duration: 200 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(receiving ? 1.18 : 1.08, { duration: receiving ? 420 : 700 }),
        withTiming(1, { duration: receiving ? 420 : 700 }),
      ),
      -1,
      true,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(receiving ? 0.55 : 0.32, { duration: 500 }),
        withTiming(0.16, { duration: 500 }),
      ),
      -1,
      true,
    );
  }, [glow, listening, pulse, receiving]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: glow.value,
  }));

  const ring = size + 28;

  return (
    <View
      style={[styles.wrap, { width: ring, height: ring }]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.ring,
          {
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            backgroundColor: colors.accent,
          },
          ringStyle,
        ]}
      />
      {listening && size >= 90 ? (
        <View style={styles.wave}>
          {[0, 70, 140, 70, 0].map((delay, i) => (
            <Bar
              key={i}
              listening={listening}
              receiving={receiving}
              delay={delay}
              maxH={receiving ? 28 : 18}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
  },
  wave: {
    position: 'absolute',
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 30,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
