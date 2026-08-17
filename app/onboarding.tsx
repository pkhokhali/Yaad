import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentColumn } from '@/components/ContentColumn';
import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { radii, spacing } from '@/constants/theme';
import { useCopy } from '@/lib/i18n/copy';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { SetupFor } from '@/types';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { scale } = useScale();
  const copy = useCopy();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const [choice, setChoice] = useState<SetupFor>('me');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ContentColumn>
        <View style={styles.inner}>
          <MemoryNodeIcon size={72} />
          <Text style={[styles.title, { color: colors.text, fontSize: scale.heroTitle + 4 }]}>
            {copy.whoTitle}
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted, fontSize: scale.body }]}>
            {copy.whoSubtitle}
          </Text>

          {(['me', 'family'] as const).map((value) => {
            const selected = choice === value;
            return (
              <Pressable
                key={value}
                onPress={() => setChoice(value)}
                style={{
                  minHeight: scale.minHitTarget + 12,
                  borderRadius: scale.radius,
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accentSoft : colors.surface,
                  padding: scale.cardPad,
                  marginTop: scale.gap,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: scale.body }}>
                  {value === 'me' ? copy.whoMe : copy.whoFamily}
                </Text>
                <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: scale.meta }}>
                  {value === 'me' ? copy.whoMeHint : copy.whoFamilyHint}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => completeOnboarding(choice)}
            style={{
              marginTop: spacing.xxl,
              minHeight: scale.minHitTarget,
              borderRadius: radii.pill,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#1A1C21', fontWeight: '800', fontSize: scale.heroBtn }}>
              {copy.continue}
            </Text>
          </Pressable>
        </View>
      </ContentColumn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  title: { fontWeight: '700', textAlign: 'center', marginTop: spacing.lg },
  sub: { textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
});
