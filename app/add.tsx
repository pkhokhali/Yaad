import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryChip } from '@/components/CategoryChip';
import { ChecklistRows } from '@/components/ChecklistRows';
import { ContentColumn } from '@/components/ContentColumn';
import { PhotoAttach } from '@/components/PhotoAttach';
import { radii, spacing } from '@/constants/theme';
import { CARE_CATEGORIES, CATEGORY_LABEL } from '@/lib/care/categories';
import { persistReminderPhoto } from '@/lib/care/photos';
import { useResponsive } from '@/hooks/useResponsive';
import { useCopy } from '@/lib/i18n/copy';
import { splitListItems, toChecklistItems } from '@/lib/parse/listItems';
import { parseCaptureText } from '@/lib/services/parser';
import { useScale } from '@/providers/ScaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useReminderStore } from '@/store/useReminderStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Category, ChecklistItem } from '@/types';

const CATEGORIES = CARE_CATEGORIES;

export default function AddReminderScreen() {
  const insets = useSafeAreaInsets();
  const { gutter, s } = useResponsive();
  const { colors } = useTheme();
  const { scale } = useScale();
  const copy = useCopy();
  const router = useRouter();
  const params = useLocalSearchParams<{ draft?: string; fromVoice?: string }>();
  const addReminder = useReminderStore((s) => s.addReminder);
  const getSettings = useSettingsStore((s) => s.getSettings);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [category, setCategory] = useState<Category>('general');
  const [everyDay, setEveryDay] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[] | undefined>();
  const [parsing, setParsing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const styles = useMemo(() => makeAddStyles(colors), [colors]);

  const draft = useMemo(
    () => (typeof params.draft === 'string' ? params.draft : ''),
    [params.draft],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!draft.trim()) {
        setParsing(false);
        return;
      }
      setParsing(true);
      try {
        const parsed = await parseCaptureText(draft);
        if (cancelled) return;
        setTitle(parsed.title);
        setDueAt(parsed.dueAt);
        setCategory(parsed.category);
        setEveryDay(parsed.repeatDaily);
        setItems(parsed.items);
        if (params.fromVoice === '1') {
          setNotes(parsed.rawText);
        }
      } finally {
        if (!cancelled) setParsing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft, params.fromVoice]);

  const onChangeDate = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setDueAt(date);
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const reminder = await addReminder(
        {
          title: title.trim(),
          notes: notes.trim() || null,
          due_at: dueAt.getTime(),
          category,
          repeat_rule: everyDay ? 'daily' : null,
          items:
            items ?? toChecklistItems(splitListItems(title.trim())),
        },
        getSettings(),
      );
      if (photoUri) {
        const stored = await persistReminderPhoto(photoUri, reminder.id);
        await useReminderStore.getState().editReminder(
          reminder.id,
          { image_uri: stored },
          getSettings(),
        );
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ContentColumn>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            {
              paddingLeft: Math.max(gutter, insets.left),
              paddingRight: Math.max(gutter, insets.right),
              paddingBottom: s(32) + insets.bottom,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
      {parsing ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Understanding your reminder…</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>What</Text>
          <TextInput
            style={[styles.titleInput, { fontSize: scale.heroTitle }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Reminder title"
            placeholderTextColor={colors.textSubtle}
            autoFocus={!draft}
          />

          {items && items.length > 0 ? (
            <ChecklistRows
              items={items}
              onToggle={(index) =>
                setItems((prev) =>
                  prev?.map((item, i) =>
                    i === index ? { ...item, done: !item.done } : item,
                  ),
                )
              }
              maxVisible={99}
            />
          ) : null}

          <Text style={[styles.label, { marginTop: spacing.lg }]}>When</Text>
          <Pressable
            style={styles.whenRow}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons name="time-outline" size={18} color={colors.accent} />
            <Text style={styles.whenText}>
              {dueAt.toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </Pressable>
          {showPicker ? (
            <DateTimePicker
              value={dueAt}
              mode="datetime"
              onChange={onChangeDate}
              minimumDate={new Date()}
            />
          ) : null}

          <Pressable
            style={[styles.everyDay, everyDay && styles.everyDayOn]}
            onPress={() => setEveryDay((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: everyDay }}
          >
            <Text style={[styles.everyDayText, everyDay && styles.everyDayTextOn]}>
              {copy.dailyTasks}
            </Text>
            <Text style={styles.everyDayHint}>
              {everyDay
                ? 'Comes back tomorrow after you tap Done'
                : copy.once}
            </Text>
          </Pressable>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>
            What kind
          </Text>
          <View style={styles.categories}>
            {CATEGORIES.map((c) => {
              const selected = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    setCategory(c);
                    if (c === 'medicine') setEveryDay(true);
                  }}
                  style={[
                    styles.categoryBtn,
                    selected && styles.categoryBtnSelected,
                  ]}
                >
                  <CategoryChip category={c} filled={selected} size={28} />
                  <Text
                    style={[
                      styles.categoryLabel,
                      selected && styles.categoryLabelSelected,
                    ]}
                  >
                    {CATEGORY_LABEL[c]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <PhotoAttach
            uri={photoUri}
            onChange={setPhotoUri}
            prompt={
              category === 'medicine'
                ? 'Picture of the medicine'
                : category === 'buy'
                  ? 'Picture of what to buy'
                  : category === 'doctor'
                    ? 'Picture of the appointment'
                    : 'Add a photo'
            }
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional"
            placeholderTextColor={colors.textSubtle}
            multiline
          />
        </View>
      )}

      <Pressable
        style={[styles.saveBtn, (!title.trim() || saving) && styles.saveDisabled]}
        onPress={save}
        disabled={!title.trim() || saving || parsing}
      >
        {saving ? (
          <ActivityIndicator color="#1A1C21" />
        ) : (
          <Text style={styles.saveText}>{copy.saveReminder}</Text>
        )}
      </Pressable>
      </ScrollView>
      </ContentColumn>
    </KeyboardAvoidingView>
  );
}

function makeAddStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingVertical: spacing.lg },
  loading: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  loadingText: { color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
    padding: spacing.lg,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  whenText: { fontSize: 16, color: colors.text, fontWeight: '500' },
  everyDay: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  everyDayOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  everyDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
  everyDayTextOn: { color: colors.text },
  everyDayHint: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSubtle,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryBtnSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  categoryLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  categoryLabelSelected: { color: colors.text, fontWeight: '600' },
  notesInput: {
    minHeight: 72,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: '#1A1C21', fontSize: 16, fontWeight: '700' },
  });
}
