import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { brand, colors } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';

type Props = {
  ready: boolean;
  onFinished: () => void;
};

export function MemorySplash({ ready, onFinished }: Props) {
  const { s } = useResponsive();
  const startedAt = useRef(Date.now());
  const finished = useRef(false);
  const node = useSharedValue(0);
  const word = useSharedValue(0);
  const whisper = useSharedValue(0);
  const screen = useSharedValue(1);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onFinished();
  };

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    node.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    word.value = withDelay(
      420,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    whisper.value = withDelay(900, withTiming(1, { duration: 700 }));
  }, [node, word, whisper]);

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, 3000 - elapsed);
    const hold = setTimeout(() => {
      screen.value = withTiming(
        0,
        { duration: 420, easing: Easing.in(Easing.cubic) },
        (done) => {
          if (done) runOnJS(finish)();
        },
      );
    }, wait);
    return () => clearTimeout(hold);
  }, [ready, screen]);

  const nodeStyle = useAnimatedStyle(() => ({
    opacity: node.value * screen.value,
    transform: [{ scale: 0.88 + node.value * 0.12 }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value * screen.value,
    transform: [{ translateY: (1 - word.value) * 8 }],
  }));

  const whisperStyle = useAnimatedStyle(() => ({
    opacity: whisper.value * screen.value,
  }));

  return (
    <Pressable
      style={styles.root}
      onPress={() => {
        if (!ready) return;
        if (Date.now() - startedAt.current < 3000) return;
        finish();
      }}
    >
      <View style={styles.center}>
        <Animated.View style={nodeStyle}>
          <MemoryNodeIcon size={s(96)} />
        </Animated.View>
        <Animated.Text style={[styles.word, { fontSize: s(36) }, wordStyle]}>
          Yaad
        </Animated.Text>
        <Animated.Text style={[styles.whisper, whisperStyle]}>
          {brand.voiceTagline}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  word: {
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  whisper: {
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.4,
    fontStyle: 'italic',
  },
});
