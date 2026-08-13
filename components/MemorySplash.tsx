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

import { colors } from '@/constants/theme';

type Props = {
  ready: boolean;
  onFinished: () => void;
};

export function MemorySplash({ ready, onFinished }: Props) {
  const finished = useRef(false);
  const ghost = useSharedValue(0);
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
    ghost.value = withTiming(0.22, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
    word.value = withDelay(
      320,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
    );
    whisper.value = withDelay(980, withTiming(1, { duration: 700 }));
  }, [ghost, word, whisper]);

  useEffect(() => {
    if (!ready) return;
    const hold = setTimeout(() => {
      screen.value = withTiming(
        0,
        { duration: 480, easing: Easing.in(Easing.cubic) },
        (done) => {
          if (done) runOnJS(finish)();
        },
      );
    }, 650);
    return () => clearTimeout(hold);
  }, [ready, screen]);

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghost.value * screen.value,
    transform: [{ scale: 1.08 + (1 - ghost.value) * 0.04 }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value * screen.value,
    transform: [{ translateY: (1 - word.value) * 8 }],
  }));

  const whisperStyle = useAnimatedStyle(() => ({
    opacity: whisper.value * screen.value,
  }));

  return (
    <Pressable style={styles.root} onPress={() => (ready ? finish() : undefined)}>
      <View style={styles.center}>
        <View style={styles.wordWrap}>
          <Animated.Text style={[styles.ghost, ghostStyle]}>याद</Animated.Text>
          <Animated.Text style={[styles.word, wordStyle]}>याद</Animated.Text>
        </View>
        <Animated.Text style={[styles.whisper, whisperStyle]}>
          it comes back
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
  },
  wordWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  ghost: {
    position: 'absolute',
    fontSize: 92,
    fontWeight: '300',
    color: colors.accent,
    letterSpacing: 8,
  },
  word: {
    fontSize: 64,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 6,
  },
  whisper: {
    marginTop: 18,
    fontSize: 13,
    color: colors.textSubtle,
    letterSpacing: 2.4,
    textTransform: 'lowercase',
  },
});
