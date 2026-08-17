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
import { brand } from '@/constants/theme';
import { useCopy } from '@/lib/i18n/copy';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  ready: boolean;
  onFinished: () => void;
};

export function MemorySplash({ ready, onFinished }: Props) {
  const { s } = useResponsive();
  const { colors } = useTheme();
  const copy = useCopy();
  const startedAt = useRef(Date.now());
  const finished = useRef(false);
  const node = useSharedValue(0);
  const word = useSharedValue(0);
  const names = useSharedValue(0);
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
    names.value = withDelay(
      680,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    whisper.value = withDelay(980, withTiming(1, { duration: 700 }));
  }, [node, word, names, whisper]);

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

  const namesStyle = useAnimatedStyle(() => ({
    opacity: names.value * screen.value,
    transform: [{ translateY: (1 - names.value) * 6 }],
  }));

  const whisperStyle = useAnimatedStyle(() => ({
    opacity: whisper.value * screen.value,
  }));

  return (
    <Pressable
      style={[styles.root, { backgroundColor: colors.background }]}
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
        <Animated.Text
          style={[
            styles.word,
            { fontSize: s(36), color: colors.text },
            wordStyle,
          ]}
        >
          Yaad
        </Animated.Text>
        <Animated.Text
          style={[
            styles.names,
            { fontSize: s(18), color: colors.accent },
            namesStyle,
          ]}
        >
          {brand.localNames}
        </Animated.Text>
        <Animated.Text
          style={[styles.whisper, { color: colors.textMuted }, whisperStyle]}
        >
          {copy.splashTagline}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    letterSpacing: 1,
  },
  names: {
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  whisper: {
    fontSize: 13,
    letterSpacing: 0.4,
    fontStyle: 'italic',
  },
});
