import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/dashboard/PrimaryButton';
import { ContentColumn } from '@/components/ContentColumn';
import { radii, spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/providers/ThemeProvider';
import { useMoneyStore } from '@/store/useMoneyStore';
import { parseExpenseVoice } from '@/lib/services/voiceGuide';
import { ExpenseLedger, MoneyKind } from '@/types/money';

export default function AddMoneyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; draft?: string }>();
  const kind: MoneyKind = params.kind === 'lend' ? 'lend' : 'expense';
  const { gutter } = useResponsive();
  const { colors } = useTheme();
  const addEntry = useMoneyStore((s) => s.addEntry);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState('');
  const [ledger, setLedger] = useState<ExpenseLedger>('personal');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    const draft = typeof params.draft === 'string' ? params.draft.trim() : '';
    if (!draft) return;
    setNotes(draft);
    const parsed = parseExpenseVoice(draft);
    if (parsed) {
      setTitle(parsed.title);
      setAmount(String(parsed.amount));
      setLedger(parsed.ledger);
    }
  }, [params.draft]);

  const save = async () => {
    const value = Number(amount.replace(/,/g, ''));
    if (!title.trim() || !Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      await addEntry({
        kind,
        title: title.trim(),
        amount: value,
        ledger,
        person: kind === 'lend' ? person.trim() || null : null,
        notes: notes.trim() || null,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ContentColumn>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: gutter,
              paddingBottom: spacing.xxxl,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.heading}>
              {kind === 'lend' ? 'Add lend' : 'Add expense'}
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={kind === 'lend' ? 'Lent to friend' : 'Travel, medicine…'}
                placeholderTextColor={colors.textSubtle}
              />

              <Text style={styles.label}>Amount (Rs)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="750"
                placeholderTextColor={colors.textSubtle}
              />

              {kind === 'lend' ? (
                <>
                  <Text style={styles.label}>Person</Text>
                  <TextInput
                    style={styles.input}
                    value={person}
                    onChangeText={setPerson}
                    placeholder="Who borrowed?"
                    placeholderTextColor={colors.textSubtle}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Ledger</Text>
                  <View style={styles.row}>
                    {(['office', 'personal'] as ExpenseLedger[]).map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => setLedger(value)}
                        style={[
                          styles.chip,
                          ledger === value && styles.chipOn,
                        ]}
                      >
                        <Text
                          style={{
                            color: ledger === value ? colors.text : colors.textMuted,
                            fontWeight: ledger === value ? '700' : '500',
                          }}
                        >
                          {value === 'office' ? 'Office' : 'Personal'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 72 }]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Optional"
                placeholderTextColor={colors.textSubtle}
              />
            </View>

            <PrimaryButton
              label={saving ? 'Saving…' : 'Save'}
              onPress={save}
              style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
            />
          </ScrollView>
        </ContentColumn>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    heading: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginVertical: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderHairline,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSubtle,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: spacing.sm,
    },
    input: {
      fontSize: 16,
      color: colors.text,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderHairline,
    },
    row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    chipOn: {
      borderColor: colors.primaryButton,
      backgroundColor: colors.surfaceElevated,
    },
  });
}
