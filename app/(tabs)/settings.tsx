import { useMemo } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openBatterySettings } from 'yaad-native';

import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { brand, colors, radii, spacing } from '@/constants/theme';
import { promptOfflineLanguageDownload } from '@/lib/services/speechRecognition';
import { openVoiceCapture } from '@/lib/services/voiceCapture';
import { VOICE_LANGUAGE_OPTIONS } from '@/lib/services/voiceLanguages';
import { useSettingsStore } from '@/store/useSettingsStore';
import { UrgencyCurve } from '@/types';

function hourLabel(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SettingsScreen() {
  const quietHoursEnabled = useSettingsStore((s) => s.quietHoursEnabled);
  const quietHoursStart = useSettingsStore((s) => s.quietHoursStart);
  const quietHoursEnd = useSettingsStore((s) => s.quietHoursEnd);
  const defaultUrgencyCurve = useSettingsStore((s) => s.defaultUrgencyCurve);
  const notificationSound = useSettingsStore((s) => s.notificationSound);
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');
  const setQuietHoursEnabled = useSettingsStore((s) => s.setQuietHoursEnabled);
  const setQuietHours = useSettingsStore((s) => s.setQuietHours);
  const setDefaultUrgencyCurve = useSettingsStore(
    (s) => s.setDefaultUrgencyCurve,
  );
  const setNotificationSound = useSettingsStore((s) => s.setNotificationSound);
  const setVoiceLanguage = useSettingsStore((s) => s.setVoiceLanguage);
  const speakAlerts = useSettingsStore((s) => s.speakAlerts ?? true);
  const setSpeakAlerts = useSettingsStore((s) => s.setSpeakAlerts);

  const curves = useMemo(
    () =>
      [
        { value: 'standard' as UrgencyCurve, label: 'Standard', hint: 'One alert at due time' },
        {
          value: 'escalating' as UrgencyCurve,
          label: 'Escalating',
          hint: 'Quiet nudge 60m early, then alert',
        },
      ] as const,
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <MemoryNodeIcon size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>Settings</Text>
            <Text style={styles.lead}>{brand.motto}</Text>
          </View>
        </View>
        <Text style={styles.leadSecondary}>
          Notifications stay on-device. Nothing leaves your phone.
        </Text>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.rowTitle}>Quiet hours</Text>
              <Text style={styles.rowHint}>
                Defer alerts that fall between these hours
              </Text>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>

          {quietHoursEnabled ? (
            <View style={styles.quietBlock}>
              <Text style={styles.subLabel}>From</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hourRow}>
                  {HOURS.map((h) => (
                    <Pressable
                      key={`s-${h}`}
                      onPress={() => setQuietHours(h, quietHoursEnd)}
                      style={[
                        styles.hourChip,
                        quietHoursStart === h && styles.hourChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.hourText,
                          quietHoursStart === h && styles.hourTextSelected,
                        ]}
                      >
                        {hourLabel(h)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Text style={[styles.subLabel, { marginTop: spacing.md }]}>
                Until
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hourRow}>
                  {HOURS.map((h) => (
                    <Pressable
                      key={`e-${h}`}
                      onPress={() => setQuietHours(quietHoursStart, h)}
                      style={[
                        styles.hourChip,
                        quietHoursEnd === h && styles.hourChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.hourText,
                          quietHoursEnd === h && styles.hourTextSelected,
                        ]}
                      >
                        {hourLabel(h)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>

        <Text style={styles.section}>Hey Google & shortcuts</Text>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Add reminders hands-free</Text>
          <Text style={[styles.rowHint, { marginTop: spacing.sm }]}>
            Pin Yaad’s voice shortcut, or teach Google Assistant to open Yaad
            and start listening — similar to “Hey Google, remind me…”.
          </Text>
          <View style={styles.steps}>
            <Text style={styles.step}>
              1. Long-press the Yaad icon → Shortcuts → “Voice reminder”
            </Text>
            <Text style={styles.step}>
              2. Or say “Hey Google, add reminder in Yaad”
            </Text>
            <Text style={styles.step}>
              3. Or “Hey Google, open voice reminder in Yaad”
            </Text>
          </View>
          <Pressable
            style={styles.batteryBtn}
            onPress={() => openVoiceCapture()}
          >
            <Text style={styles.batteryBtnText}>Try voice capture now</Text>
          </Pressable>
          {Platform.OS === 'android' ? (
            <Pressable
              style={[styles.batteryBtn, { marginTop: spacing.sm }]}
              onPress={() =>
                Linking.openSettings().catch(() => undefined)
              }
            >
              <Text style={styles.batteryBtnText}>Open app settings</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.rowHint, { marginTop: spacing.md }]}>
            Assistant phrases may take a day to sync after install. Yaad listens
            on-device — nothing is sent to the cloud.
          </Text>
        </View>

        <Text style={styles.section}>Voice language</Text>
        <View style={styles.card}>
          {VOICE_LANGUAGE_OPTIONS.map((lang, idx, arr) => (
            <Pressable
              key={lang.value}
              onPress={() => setVoiceLanguage(lang.value)}
              style={[
                styles.choice,
                idx < arr.length - 1 && styles.choiceBorder,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {lang.nativeLabel}
                  {lang.nativeLabel !== lang.label ? ` · ${lang.label}` : ''}
                </Text>
                <Text style={styles.rowHint}>{lang.hint}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  voiceLanguage === lang.value && styles.radioOn,
                ]}
              />
            </Pressable>
          ))}
          {voiceLanguage === 'new' ? (
            <Text style={styles.fallbackNote}>
              Most phones have no Newari speech model. Yaad will listen in
              Nepali and still parse नेपाल भाषा time words in the transcript.
            </Text>
          ) : null}
          {voiceLanguage === 'ne' ? (
            <Text style={styles.fallbackNote}>
              Nepali works best with internet on. Speak clearly, include the
              time (“2 minute pachhi”, “भोलि 8 बजे”). Romanized Nepali from
              Google STT is supported too.
            </Text>
          ) : null}
          {voiceLanguage === 'en' ? (
            <Text style={styles.fallbackNote}>
              Say the full phrase: “remind me to call mom after 2 minutes”.
              Hold the mic until you finish speaking.
            </Text>
          ) : null}
          {Platform.OS === 'android' && voiceLanguage !== 'en' ? (
            <Pressable
              style={[styles.batteryBtn, { marginTop: spacing.md }]}
              onPress={() =>
                promptOfflineLanguageDownload(voiceLanguage).catch(
                  () => undefined,
                )
              }
            >
              <Text style={styles.batteryBtnText}>
                Download offline voice model
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.section}>Default urgency</Text>
        <View style={styles.card}>
          {curves.map((c, idx) => (
            <Pressable
              key={c.value}
              onPress={() => setDefaultUrgencyCurve(c.value)}
              style={[
                styles.choice,
                idx < curves.length - 1 && styles.choiceBorder,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{c.label}</Text>
                <Text style={styles.rowHint}>{c.hint}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  defaultUrgencyCurve === c.value && styles.radioOn,
                ]}
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Notification style</Text>
        <View style={styles.card}>
          {(
            [
              { value: 'default', label: 'Default' },
              { value: 'subtle', label: 'Subtle' },
              { value: 'prominent', label: 'Prominent' },
            ] as const
          ).map((s, idx, arr) => (
            <Pressable
              key={s.value}
              onPress={() => setNotificationSound(s.value)}
              style={[
                styles.choice,
                idx < arr.length - 1 && styles.choiceBorder,
              ]}
            >
              <Text style={styles.rowTitle}>{s.label}</Text>
              <View
                style={[
                  styles.radio,
                  notificationSound === s.value && styles.radioOn,
                ]}
              />
            </Pressable>
          ))}
          <View
            style={[
              styles.choice,
              {
                marginTop: spacing.sm,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.borderHairline,
                paddingTop: spacing.lg,
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.rowTitle}>Speak alerts</Text>
              <Text style={styles.rowHint}>
                Generates on-device speech for each alert (plays on lock
                screen). Call reminders can also wake the screen with Call /
                Done / Snooze.
              </Text>
            </View>
            <Switch
              value={speakAlerts}
              onValueChange={setSpeakAlerts}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        </View>

        {Platform.OS === 'android' ? (
          <View style={[styles.card, { marginTop: spacing.lg }]}>
            <Text style={styles.rowTitle}>Reliable alerts</Text>
            <Text style={[styles.rowHint, { marginTop: spacing.sm }]}>
              On some phones, battery savers delay reminders. Allow Yaad to run
              unrestricted so spoken alerts and call interrupts arrive on time.
            </Text>
            <Pressable
              style={styles.batteryBtn}
              onPress={() => openBatterySettings().catch(() => undefined)}
            >
              <Text style={styles.batteryBtnText}>Open battery settings</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Yaad · याद · local-first · no accounts · no cloud
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  brand: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  lead: {
    fontSize: 13,
    color: colors.accent,
    marginTop: 2,
    fontWeight: '500',
  },
  leadSecondary: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
    padding: spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  quietBlock: { marginTop: spacing.lg },
  subLabel: {
    fontSize: 12,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  hourRow: { flexDirection: 'row', gap: spacing.sm },
  hourChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  hourChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  hourText: { fontSize: 13, color: colors.textMuted },
  hourTextSelected: { color: colors.text, fontWeight: '600' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  choiceBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderHairline,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  fallbackNote: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  batteryBtn: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  batteryBtnText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  steps: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  step: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  footer: {
    marginTop: spacing.xxxl,
    textAlign: 'center',
    color: colors.textSubtle,
    fontSize: 12,
  },
});
