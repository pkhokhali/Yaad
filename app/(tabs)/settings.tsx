import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openBatterySettings } from 'yaad-native';

import { AdBanner } from '@/components/AdBanner';
import { ContentColumn } from '@/components/ContentColumn';
import { MemoryNodeIcon } from '@/components/MemoryNodeIcon';
import { brand, radii, spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import {
  MAX_ALERTS_EACH_SIDE,
  careAlertSummary,
} from '@/lib/care/alerts';
import { useCopy } from '@/lib/i18n/copy';
import { promptOfflineLanguageDownload } from '@/lib/services/speechRecognition';
import {
  downloadNepaliOfflineModel,
  getNepaliOfflineStatus,
} from '@/lib/services/offlineVoiceModel';
import { rescheduleOpenReminders } from '@/lib/services/notifications';
import { openGuidedVoiceCapture } from '@/lib/services/voiceCapture';
import { VOICE_LANGUAGE_OPTIONS } from '@/lib/services/voiceLanguages';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useYaadItemStore } from '@/store/useYaadItemStore';
import {
  ScaleMode,
  ThemeName,
  UiLanguage,
  dateFromMinutes,
  minutesFromDate,
  minutesToClockLabel,
} from '@/types';

function applyScheduleSettings() {
  rescheduleOpenReminders(useSettingsStore.getState().getSettings()).catch(
    () => undefined,
  );
}

const NOTIFICATION_STYLE_OPTIONS = [
  {
    value: 'default' as const,
    label: 'Default',
    hint: 'Normal banner and sound. Spoken read-out follows the Speak alerts toggle below.',
  },
  {
    value: 'subtle' as const,
    label: 'Subtle',
    hint: 'Silent — banner only, no chime and no spoken alert. Best in meetings or at night.',
  },
  {
    value: 'prominent' as const,
    label: 'Prominent',
    hint: 'Highest priority banner. Use with Speak alerts for the loudest on-device read-out.',
  },
];

function AlertCountRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (count: number) => void;
}) {
  const { colors } = useTheme();
  const { scale } = useScale();
  return (
    <View style={{ paddingVertical: spacing.sm }}>
      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>
        {label}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 13,
          lineHeight: 18,
          marginTop: 4,
          marginBottom: spacing.md,
        }}
      >
        {hint}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          accessibilityLabel={`Decrease ${label}`}
          disabled={value <= 0}
          onPress={() => onChange(value - 1)}
          style={{
            width: scale.minHitTarget,
            height: scale.minHitTarget,
            borderRadius: scale.radius,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            opacity: value <= 0 ? 0.35 : 1,
          }}
        >
          <Ionicons name="remove" size={20} color={colors.text} />
        </Pressable>
        <Text
          style={{
            color: colors.text,
            fontSize: 28,
            fontWeight: '700',
            minWidth: 48,
            textAlign: 'center',
          }}
        >
          {value}
        </Text>
        <Pressable
          accessibilityLabel={`Increase ${label}`}
          disabled={value >= MAX_ALERTS_EACH_SIDE}
          onPress={() => onChange(value + 1)}
          style={{
            width: scale.minHitTarget,
            height: scale.minHitTarget,
            borderRadius: scale.radius,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            opacity: value >= MAX_ALERTS_EACH_SIDE ? 0.35 : 1,
          }}
        >
          <Ionicons name="add" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  const { scale } = useScale();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              minHeight: scale.minHitTarget,
              borderRadius: scale.radius,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.accentSoft : colors.background,
              borderWidth: 1,
              borderColor: on ? colors.accent : colors.border,
              paddingHorizontal: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontWeight: on ? '700' : '500',
                fontSize: scale.body,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const { gutter } = useResponsive();
  const { colors, theme, setTheme } = useTheme();
  const { scale, mode, setMode } = useScale();
  const copy = useCopy();
  const streak = useYaadItemStore((s) => s.streak);
  const displayName = useSettingsStore((s) => s.displayName ?? '');
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);

  const quietHoursEnabled = useSettingsStore((s) => s.quietHoursEnabled);
  const quietHoursStart = useSettingsStore((s) => s.quietHoursStart);
  const quietHoursEnd = useSettingsStore((s) => s.quietHoursEnd);
  const notificationSound = useSettingsStore((s) => s.notificationSound);
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage ?? 'en');
  const uiLanguage = useSettingsStore((s) => s.uiLanguage ?? 'en');
  const allowVoiceOnMobileData = useSettingsStore(
    (s) => s.allowVoiceOnMobileData ?? false,
  );
  const alertsBeforeCount = useSettingsStore(
    (s) => s.alertsBeforeCount ?? 0,
  );
  const alertsAfterCount = useSettingsStore((s) => s.alertsAfterCount ?? 1);
  const setQuietHoursEnabled = useSettingsStore((s) => s.setQuietHoursEnabled);
  const setQuietHours = useSettingsStore((s) => s.setQuietHours);
  const setNotificationSound = useSettingsStore((s) => s.setNotificationSound);
  const setVoiceLanguage = useSettingsStore((s) => s.setVoiceLanguage);
  const setUiLanguage = useSettingsStore((s) => s.setUiLanguage);
  const setAllowVoiceOnMobileData = useSettingsStore(
    (s) => s.setAllowVoiceOnMobileData,
  );
  const speakAlerts = useSettingsStore((s) => s.speakAlerts ?? true);
  const setSpeakAlerts = useSettingsStore((s) => s.setSpeakAlerts);
  const setAlertsBeforeCount = useSettingsStore((s) => s.setAlertsBeforeCount);
  const setAlertsAfterCount = useSettingsStore((s) => s.setAlertsAfterCount);
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const [offlineNepali, setOfflineNepali] = useState<
    'checking' | 'ready' | 'missing' | 'unavailable'
  >('checking');
  const [downloadingNepali, setDownloadingNepali] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      setOfflineNepali('unavailable');
      return;
    }
    let cancelled = false;
    getNepaliOfflineStatus()
      .then((status) => {
        if (cancelled) return;
        setOfflineNepali(
          status.installed
            ? 'ready'
            : status.canDownload
              ? 'missing'
              : 'unavailable',
        );
      })
      .catch(() => {
        if (!cancelled) setOfflineNepali('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [voiceLanguage, downloadingNepali]);

  const refreshNepaliPack = async () => {
    const status = await getNepaliOfflineStatus();
    setOfflineNepali(
      status.installed
        ? 'ready'
        : status.canDownload
          ? 'missing'
          : 'unavailable',
    );
  };

  const installNepaliPack = async () => {
    if (downloadingNepali) return;
    setDownloadingNepali(true);
    try {
      const result = await downloadNepaliOfflineModel();
      Alert.alert(
        result.ok
          ? uiLanguage === 'ne'
            ? 'नेपाली अफलाइन आवाज'
            : 'Nepali offline voice'
          : uiLanguage === 'ne'
            ? 'डाउनलोड भएन'
            : 'Download did not finish',
        result.message,
      );
      await refreshNepaliPack();
    } finally {
      setDownloadingNepali(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ContentColumn>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: gutter, paddingBottom: spacing.xxxl },
          ]}
        >
          <View style={styles.titleRow}>
            <MemoryNodeIcon size={36} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.brand, { fontSize: scale.heroTitle + 4 }]}>
                {copy.tabs.settings}
              </Text>
              <Text style={styles.lead}>{brand.motto}</Text>
            </View>
          </View>
          <Text style={styles.leadSecondary}>
            Reminders stay on-device. Nothing leaves this phone.
          </Text>

          {streak > 0 ? (
            <Text style={[styles.rowHint, { marginBottom: spacing.lg }]}>
              {streak} day streak · saved on this device only
            </Text>
          ) : null}

          <Text style={styles.section}>Profile</Text>
          <View style={styles.card}>
            <Text style={styles.rowTitle}>Your name</Text>
            <Text style={[styles.rowHint, { marginBottom: spacing.md }]}>
              Shown on the dashboard greeting.
            </Text>
            <TextInput
              style={{
                fontSize: 16,
                color: colors.text,
                paddingVertical: spacing.sm,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderHairline,
              }}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          <Text style={styles.section}>Appearance</Text>
          <View style={styles.card}>
            <Text style={styles.rowTitle}>Theme</Text>
            <Text style={[styles.rowHint, { marginBottom: spacing.md }]}>
              Dark or a light Normal look. Same amber accent either way.
            </Text>
            <Segmented<ThemeName>
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'normal', label: 'Normal' },
              ]}
            />
            <Text style={[styles.rowTitle, { marginTop: spacing.lg }]}>
              Size
            </Text>
            <Text style={[styles.rowHint, { marginBottom: spacing.md }]}>
              {copy.whoSubtitle}
            </Text>
            <Segmented<ScaleMode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'standard', label: copy.standard },
                { value: 'comfort', label: copy.comfort },
              ]}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={styles.rowTitle}>Quiet hours</Text>
                <Text style={styles.rowHint}>
                  Don’t ring in this window. The due-time alert waits until it
                  ends — extras are skipped, not dumped all at once.
                </Text>
              </View>
              <Switch
                value={quietHoursEnabled}
                onValueChange={(enabled) => {
                  setQuietHoursEnabled(enabled);
                  applyScheduleSettings();
                }}
                trackColor={{ true: colors.accent, false: colors.border }}
              />
            </View>

            {quietHoursEnabled ? (
              <View style={styles.quietBlock}>
                <Text style={styles.subLabel}>From</Text>
                <Pressable
                  style={styles.timeBtn}
                  onPress={() => setPicking('start')}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.accent}
                  />
                  <Text style={styles.timeBtnText}>
                    {minutesToClockLabel(quietHoursStart)}
                  </Text>
                </Pressable>
                <Text style={[styles.subLabel, { marginTop: spacing.md }]}>
                  Until
                </Text>
                <Pressable
                  style={styles.timeBtn}
                  onPress={() => setPicking('end')}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.accent}
                  />
                  <Text style={styles.timeBtnText}>
                    {minutesToClockLabel(quietHoursEnd)}
                  </Text>
                </Pressable>
                {picking ? (
                  <DateTimePicker
                    value={dateFromMinutes(
                      picking === 'start' ? quietHoursStart : quietHoursEnd,
                    )}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') setPicking(null);
                      if (event.type === 'dismissed' || !date) return;
                      const minutes = minutesFromDate(date);
                      if (picking === 'start') {
                        setQuietHours(minutes, quietHoursEnd);
                      } else {
                        setQuietHours(quietHoursStart, minutes);
                      }
                      applyScheduleSettings();
                    }}
                  />
                ) : null}
              </View>
            ) : null}
          </View>

          <Text style={styles.section}>Reminder alerts</Text>
          <View style={styles.card}>
            <Text style={[styles.rowHint, { marginBottom: spacing.lg }]}>
              Standard is one alert at the due time plus one follow-up if you
              have not tapped Done. Adjust each side up to {MAX_ALERTS_EACH_SIDE}.
            </Text>
            <AlertCountRow
              label="Before due time"
              hint="Extra nudges leading up to the deadline (15–180 min before)."
              value={alertsBeforeCount}
              onChange={(count) => {
                setAlertsBeforeCount(count);
                applyScheduleSettings();
              }}
            />
            <View
              style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderHairline,
                marginVertical: spacing.md,
              }}
            />
            <AlertCountRow
              label="After due if not Done"
              hint="Follow-ups if the reminder is still open (15–120 min after)."
              value={alertsAfterCount}
              onChange={(count) => {
                setAlertsAfterCount(count);
                applyScheduleSettings();
              }}
            />
            <Text style={[styles.rowHint, { marginTop: spacing.lg }]}>
              {careAlertSummary(alertsBeforeCount, alertsAfterCount)}
            </Text>
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
              onPress={() => openGuidedVoiceCapture()}
            >
              <Text style={styles.batteryBtnText}>Try voice capture now</Text>
            </Pressable>
            {Platform.OS === 'android' ? (
              <Pressable
                style={[styles.batteryBtn, { marginTop: spacing.sm }]}
                onPress={() => Linking.openSettings().catch(() => undefined)}
              >
                <Text style={styles.batteryBtnText}>Open app settings</Text>
              </Pressable>
            ) : null}
            <Text style={[styles.rowHint, { marginTop: spacing.md }]}>
              Assistant phrases may take a day to sync after install. Reminders
              stay on this phone. Voice can use Google STT on Wi‑Fi (or mobile
              data if you turn that on).
            </Text>
          </View>

          <Text style={styles.section}>
            {uiLanguage === 'ne' ? 'एप भाषा' : 'App language'}
          </Text>
          <View style={styles.card}>
            <Text style={[styles.rowHint, { marginBottom: spacing.md }]}>
              {uiLanguage === 'ne'
                ? 'स्क्रिनको लेखाइ। आवाजको भाषा छुट्टै तल छ।'
                : 'Screen text only. Voice input language is separate, below.'}
            </Text>
            <Segmented<UiLanguage>
              value={uiLanguage}
              onChange={setUiLanguage}
              options={[
                { value: 'en', label: 'English' },
                { value: 'ne', label: 'नेपाली' },
              ]}
            />
          </View>

          <Text style={styles.section}>
            {uiLanguage === 'ne' ? 'आवाज भाषा' : 'Voice language'}
          </Text>
          <View style={styles.card}>
            {VOICE_LANGUAGE_OPTIONS.map((lang, idx, arr) => (
              <Pressable
                key={lang.value}
                onPress={() => {
                  setVoiceLanguage(lang.value);
                  if (lang.value === 'ne' || lang.value === 'new') {
                    void getNepaliOfflineStatus().then((status) => {
                      if (!status.installed) void installNepaliPack();
                    });
                  }
                }}
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
              <Text style={styles.fallbackNote}>{copy.newariUnavailable}</Text>
            ) : null}
            {voiceLanguage === 'ne' ? (
              <Text style={styles.fallbackNote}>
                {uiLanguage === 'ne'
                  ? 'Google को नेपाली अफलाइन मोडेल डाउनलोड भएपछि इन्टरनेट बिना पनि चल्छ। नभएसम्म Wi‑Fi मा अनलाइन STT प्रयोग हुन्छ।'
                  : 'Once Google’s Nepali offline pack is installed, voice works without internet. Until then Yaad uses Google STT on Wi‑Fi.'}
              </Text>
            ) : null}
            {voiceLanguage === 'en' ? (
              <Text style={styles.fallbackNote}>
                Say the full phrase: “remind me to call mom after 2 minutes”.
                Tap the mic, speak, then tap again.
              </Text>
            ) : null}
            {Platform.OS === 'android' ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.rowTitle}>
                  {uiLanguage === 'ne'
                    ? 'नेपाली अफलाइन मोडेल'
                    : 'Nepali offline model'}
                </Text>
                <Text style={[styles.rowHint, { marginTop: 4 }]}>
                  {offlineNepali === 'ready'
                    ? uiLanguage === 'ne'
                      ? 'यो फोनमा तयार छ — इन्टरनेट बिना चल्छ।'
                      : 'Installed on this phone — works without internet.'
                    : offlineNepali === 'checking'
                      ? uiLanguage === 'ne'
                        ? 'जाँच गर्दै…'
                        : 'Checking…'
                      : uiLanguage === 'ne'
                        ? 'Google Speech Services बाट नेपाली प्याक डाउनलोड गर्नुहोस् (Android 13+)।'
                        : 'Download Google’s Nepali speech pack (Android 13+). It cannot be bundled in the APK.'}
                </Text>
                <Pressable
                  style={[styles.batteryBtn, { marginTop: spacing.md }]}
                  onPress={() => void installNepaliPack()}
                  disabled={downloadingNepali}
                >
                  {downloadingNepali ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <Text style={styles.batteryBtnText}>
                      {offlineNepali === 'ready'
                        ? uiLanguage === 'ne'
                          ? 'नेपाली अफलाइन तयार छ'
                          : 'Nepali offline is ready'
                        : uiLanguage === 'ne'
                          ? 'नेपाली अफलाइन मोडेल डाउनलोड'
                          : 'Download Nepali offline model'}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}
            {Platform.OS === 'android' && voiceLanguage === 'new' ? (
              <Pressable
                style={[styles.batteryBtn, { marginTop: spacing.md }]}
                onPress={() =>
                  promptOfflineLanguageDownload(voiceLanguage).then((result) =>
                    Alert.alert(
                      uiLanguage === 'ne' ? 'अफलाइन आवाज' : 'Offline voice',
                      result.message,
                    ),
                  )
                }
              >
                <Text style={styles.batteryBtnText}>
                  {uiLanguage === 'ne'
                    ? 'नेपाल भाषाका लागि नेपाली प्याक डाउनलोड'
                    : 'Download Nepali pack for Newari fallback'}
                </Text>
              </Pressable>
            ) : null}
            <View
              style={[
                styles.choice,
                {
                  marginTop: spacing.md,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.borderHairline,
                  paddingTop: spacing.lg,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={styles.rowTitle}>
                  {uiLanguage === 'ne'
                    ? 'मोबाइल डाटामा आवाज'
                    : 'Voice over mobile data'}
                </Text>
                <Text style={styles.rowHint}>
                  {uiLanguage === 'ne'
                    ? 'बन्द हुँदा Google STT Wi‑Fi मा मात्र। खोलेपछि मोबाइल डाटा पनि प्रयोग हुन्छ।'
                    : 'Off: Google STT only on Wi‑Fi. On: also use mobile data for voice.'}
                </Text>
              </View>
              <Switch
                value={allowVoiceOnMobileData}
                onValueChange={setAllowVoiceOnMobileData}
                trackColor={{ true: colors.accent, false: colors.border }}
              />
            </View>
          </View>

          <Text style={styles.section}>Notification style</Text>
          <View style={styles.card}>
            <Text style={[styles.rowHint, { marginBottom: spacing.md }]}>
              How loud and visible alerts feel on your phone.
            </Text>
            {NOTIFICATION_STYLE_OPTIONS.map((s, idx, arr) => (
              <Pressable
                key={s.value}
                onPress={() => setNotificationSound(s.value)}
                style={[
                  styles.choice,
                  idx < arr.length - 1 && styles.choiceBorder,
                ]}
              >
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={styles.rowTitle}>{s.label}</Text>
                  <Text style={styles.rowHint}>{s.hint}</Text>
                </View>
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
                On some phones, battery savers delay reminders. Allow Yaad to
                run unrestricted so spoken alerts and call interrupts arrive on
                time.
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
        <AdBanner />
      </ContentColumn>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { paddingVertical: spacing.lg },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    brand: {
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
      marginBottom: spacing.md,
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
    timeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    timeBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
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
      maxWidth: '100%',
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
      flexShrink: 1,
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
}
