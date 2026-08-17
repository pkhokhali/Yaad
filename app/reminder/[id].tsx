import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { DueDateTimePicker } from '@/components/DueDateTimePicker';
import { PhotoAttach } from '@/components/PhotoAttach';
import { radii, spacing } from '@/constants/theme';
import { CARE_CATEGORIES, CATEGORY_LABEL, categorySupportsPhoto, normalizeCategory } from '@/lib/care/categories';
import { persistReminderPhoto } from '@/lib/care/photos';
import { useResponsive } from '@/hooks/useResponsive';
import { useCopy } from '@/lib/i18n/copy';
import { useTheme } from '@/providers/ThemeProvider';
import { useReminderStore } from '@/store/useReminderStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Category, Reminder, RepeatRule } from '@/types';

const CATEGORIES = CARE_CATEGORIES;

export default function ReminderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { gutter, s } = useResponsive();
  const { colors } = useTheme();
  const copy = useCopy();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const getById = useReminderStore((s) => s.getById);
  const editReminder = useReminderStore((s) => s.editReminder);
  const completeReminder = useReminderStore((s) => s.completeReminder);
  const toggleChecklistItem = useReminderStore((s) => s.toggleChecklistItem);
  const removeReminder = useReminderStore((s) => s.removeReminder);
  const snooze = useReminderStore((s) => s.snooze);
  const getSettings = useSettingsStore((s) => s.getSettings);

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState(new Date());
  const [category, setCategory] = useState<Category>('medicine');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const styles = useMemo(() => makeReminderStyles(colors), [colors]);
  const repeats: { value: RepeatRule; label: string }[] = [
    { value: null, label: copy.once },
    { value: 'daily', label: copy.dailyTasks },
    { value: 'weekly', label: 'Weekly' },
  ];

  const load = useCallback(async () => {
    if (!id) return;
    const r = await getById(id);
    if (!r) {
      router.back();
      return;
    }
    setReminder(r);
    setTitle(r.title);
    setNotes(r.notes ?? '');
    setDueAt(new Date(r.due_at));
    setCategory(normalizeCategory(r.category));
    setRepeatRule(r.repeat_rule === 'after_visit' ? 'daily' : r.repeat_rule);
    setPhotoUri(r.image_uri ?? null);
  }, [id, getById, router]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!id || !title.trim()) return;
    setBusy(true);
    try {
      let image_uri = photoUri;
      if (photoUri) {
        image_uri = await persistReminderPhoto(photoUri, id);
      }
      await editReminder(
        id,
        {
          title: title.trim(),
          notes: notes.trim() || null,
          due_at: dueAt.getTime(),
          category,
          repeat_rule: repeatRule,
          image_uri,
        },
        getSettings(),
      );
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const onDone = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await completeReminder(id, getSettings());
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const onSnooze = async (minutes: number) => {
    if (!id) return;
    setBusy(true);
    try {
      await snooze(id, minutes, getSettings());
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert('Delete reminder?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeReminder(id);
          router.back();
        },
      },
    ]);
  };

  if (!reminder) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

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
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <CategoryChip category={category} filled />
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {categorySupportsPhoto(category) ? (
          <PhotoAttach
            uri={photoUri}
            onChange={setPhotoUri}
            prompt="Picture of the medicine"
          />
        ) : null}

        <DueDateTimePicker value={dueAt} onChange={setDueAt} />

        {(reminder.items ?? []).length > 0 ? (
          <>
            <Text style={styles.label}>{copy.itemsDone(
              (reminder.items ?? []).filter((item) => item.done).length,
              (reminder.items ?? []).length,
            )}</Text>
            <ChecklistRows
              items={reminder.items ?? []}
              onToggle={async (index) => {
                if (!id) return;
                await toggleChecklistItem(id, index);
                const next = await getById(id);
                if (next) setReminder(next);
              }}
              maxVisible={99}
            />
          </>
        ) : null}

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chipBtn, category === c && styles.chipSelected]}
            >
              <CategoryChip category={c} filled={category === c} size={26} />
              <Text style={styles.chipLabel}>{CATEGORY_LABEL[c]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Repeat</Text>
        <View style={styles.chips}>
          {repeats.map((r) => (
            <Pressable
              key={String(r.value)}
              onPress={() => setRepeatRule(r.value)}
              style={[
                styles.option,
                repeatRule === r.value && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  repeatRule === r.value && styles.optionTextSelected,
                ]}
              >
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.notes}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional notes"
          placeholderTextColor={colors.textSubtle}
        />
      </View>

      <View style={styles.actions}>
        {!reminder.is_done ? (
          <>
            <Pressable style={styles.primary} onPress={onDone} disabled={busy}>
              <Text style={styles.primaryText}>{copy.done}</Text>
            </Pressable>
            <View style={styles.snoozeRow}>
              {[10, 30, 60].map((m) => (
                <Pressable
                  key={m}
                  style={styles.snooze}
                  onPress={() => onSnooze(m)}
                  disabled={busy}
                >
                  <Text style={styles.snoozeText}>+{m}m</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Pressable style={styles.secondary} onPress={save} disabled={busy}>
          <Text style={styles.secondaryText}>Save changes</Text>
        </Pressable>
        <Pressable style={styles.danger} onPress={onDelete}>
          <Text style={styles.dangerText}>Delete</Text>
        </Pressable>
      </View>
      </ScrollView>
      </ContentColumn>
    </KeyboardAvoidingView>
  );
}

function makeReminderStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingVertical: spacing.lg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHairline,
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  titleInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  optionText: { fontSize: 13, color: colors.textMuted },
  optionTextSelected: { color: colors.text, fontWeight: '600' },
  notes: {
    minHeight: 72,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryText: { color: '#1A1C21', fontWeight: '700', fontSize: 18 },
  snoozeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  snooze: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  snoozeText: { color: colors.text, fontWeight: '600' },
  secondary: {
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  danger: {
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerText: { color: colors.danger, fontWeight: '600', fontSize: 15 },
  });
}
