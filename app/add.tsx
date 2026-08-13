import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { colors, radii, spacing } from '@/constants/theme';
import { parseCaptureText } from '@/lib/services/parser';
import { useReminderStore } from '@/store/useReminderStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Category } from '@/types';

const CATEGORIES: Category[] = ['call', 'document', 'repeat', 'general'];

export default function AddReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draft?: string; fromVoice?: string }>();
  const addReminder = useReminderStore((s) => s.addReminder);
  const getSettings = useSettingsStore((s) => s.getSettings);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [category, setCategory] = useState<Category>('general');
  const [parsing, setParsing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

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
      await addReminder(
        {
          title: title.trim(),
          notes: notes.trim() || null,
          due_at: dueAt.getTime(),
          category,
        },
        getSettings(),
      );
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
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
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Reminder title"
            placeholderTextColor={colors.textSubtle}
            autoFocus={!draft}
          />

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

          <Text style={[styles.label, { marginTop: spacing.lg }]}>
            Category
          </Text>
          <View style={styles.categories}>
            {CATEGORIES.map((c) => {
              const selected = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
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
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save reminder</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
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
    textTransform: 'capitalize',
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
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
