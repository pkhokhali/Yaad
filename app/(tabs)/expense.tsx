import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/AdBanner';
import { AppHeader } from '@/components/dashboard/AppHeader';
import { EmptyPanel } from '@/components/dashboard/EmptyPanel';
import { FilterPills } from '@/components/dashboard/FilterPills';
import { PrimaryButton } from '@/components/dashboard/PrimaryButton';
import { SurfaceCard } from '@/components/dashboard/SurfaceCard';
import { ContentColumn } from '@/components/ContentColumn';
import { spacing } from '@/constants/theme';
import { formatRs } from '@/lib/db/money';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/providers/ThemeProvider';
import { useMoneyStore } from '@/store/useMoneyStore';
import { ExpenseLedger, MoneyEntry, MoneyKind } from '@/types/money';

type KindFilter = 'all' | MoneyKind;
type LedgerFilter = 'all' | ExpenseLedger;

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'lend', label: 'Lend' },
];

const LEDGER_FILTERS: { value: LedgerFilter; label: string }[] = [
  { value: 'all', label: 'All ledgers' },
  { value: 'office', label: 'Office' },
  { value: 'personal', label: 'Personal' },
];

function EntryRow({
  entry,
  onDelete,
  formatDateShort,
}: {
  entry: MoneyEntry;
  onDelete: () => void;
  formatDateShort: (date: Date) => string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.borderHairline },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{entry.title}</Text>
        <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
          {formatDateShort(new Date(entry.entry_date))}
          {entry.person ? ` · ${entry.person}` : ''}
          {entry.kind === 'expense' ? ` · ${entry.ledger}` : ' · lend'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatRs(entry.amount)}
        </Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                entry.status === 'pending'
                  ? 'rgba(251, 191, 36, 0.18)'
                  : 'rgba(22, 163, 74, 0.14)',
            },
          ]}
        >
          <Text
            style={{
              color: entry.status === 'pending' ? '#B45309' : colors.success,
              fontSize: 11,
              fontWeight: '700',
            }}
          >
            {entry.status === 'pending' ? 'Pending' : 'Settled'}
          </Text>
        </View>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>
            Delete
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ExpenseScreen() {
  const router = useRouter();
  const { gutter } = useResponsive();
  const { colors } = useTheme();
  const { formatMonthLabel, formatDateShort } = useDateFormat();
  const entries = useMoneyStore((s) => s.entries);
  const month = useMoneyStore((s) => s.month);
  const removeEntry = useMoneyStore((s) => s.removeEntry);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');

  useFocusEffect(
    useCallback(() => {
      if (useMoneyStore.getState().ready) {
        useMoneyStore.getState().refresh();
      }
    }, []),
  );

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (kindFilter !== 'all' && entry.kind !== kindFilter) return false;
      if (ledgerFilter !== 'all' && entry.ledger !== ledgerFilter) return false;
      return true;
    });
  }, [entries, kindFilter, ledgerFilter]);

  const expenseTotal = month.expenseOffice + month.expensePersonal;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ContentColumn>
        <View style={{ paddingHorizontal: gutter }}>
          <AppHeader />
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Expense & Lend</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Track spend and money lent — on this phone only
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <PrimaryButton
              label="+ Add expense"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/money/add', params: { kind: 'expense' } })
              }
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="+ Add lend"
              onPress={() =>
                router.push({ pathname: '/money/add', params: { kind: 'lend' } })
              }
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingBottom: spacing.lg,
            gap: spacing.sm,
            flexGrow: 1,
          }}
          ListHeaderComponent={
            <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
              <SurfaceCard title={formatMonthLabel()}>
                <Text style={[styles.monthTotal, { color: colors.text }]}>
                  {formatRs(expenseTotal + month.lendTotal)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                  Expense {formatRs(expenseTotal)} · Lend {formatRs(month.lendTotal)}
                </Text>
              </SurfaceCard>
              <FilterPills options={KIND_FILTERS} value={kindFilter} onChange={setKindFilter} />
              <FilterPills
                options={LEDGER_FILTERS}
                value={ledgerFilter}
                onChange={setLedgerFilter}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyPanel
              title="No entries yet"
              body="Add an expense or lend record to see it here."
            />
          }
          renderItem={({ item }) => (
            <EntryRow
              entry={item}
              formatDateShort={formatDateShort}
              onDelete={() =>
                Alert.alert('Delete entry?', item.title, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => removeEntry(item.id),
                  },
                ])
              }
            />
          )}
        />
        <AdBanner />
      </ContentColumn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  titleRow: { marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  monthTotal: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  row: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 4 },
  amount: { fontSize: 16, fontWeight: '700' },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
