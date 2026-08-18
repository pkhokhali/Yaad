import * as Crypto from 'expo-crypto';

import { getDatabase } from '@/lib/db/database';
import {
  CreateMoneyInput,
  ExpenseLedger,
  MoneyEntry,
  MoneyKind,
  MoneyStatus,
  MonthMoneyTotals,
} from '@/types/money';
import { endOfMonth, startOfMonth } from '@/lib/dashboard/dates';

function mapRow(row: MoneyEntry): MoneyEntry {
  return {
    ...row,
    person: row.person ?? null,
    notes: row.notes ?? null,
  };
}

export async function listMoneyEntries(): Promise<MoneyEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MoneyEntry>(
    'SELECT * FROM money_entries ORDER BY entry_date DESC, created_at DESC',
  );
  return rows.map(mapRow);
}

export async function createMoneyEntry(
  input: CreateMoneyInput,
): Promise<MoneyEntry> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const created_at = Date.now();
  const entry: MoneyEntry = {
    id,
    kind: input.kind,
    title: input.title.trim(),
    amount: Math.max(0, input.amount),
    ledger: input.ledger ?? 'personal',
    person: input.person?.trim() || null,
    status: input.status ?? 'pending',
    entry_date: input.entry_date ?? Date.now(),
    notes: input.notes?.trim() || null,
    created_at,
  };
  await db.runAsync(
    `INSERT INTO money_entries
      (id, kind, title, amount, ledger, person, status, entry_date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.kind,
      entry.title,
      entry.amount,
      entry.ledger,
      entry.person,
      entry.status,
      entry.entry_date,
      entry.notes,
      entry.created_at,
    ],
  );
  return entry;
}

export async function deleteMoneyEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM money_entries WHERE id = ?', [id]);
}

export async function monthTotals(
  date = new Date(),
): Promise<MonthMoneyTotals> {
  const db = await getDatabase();
  const start = startOfMonth(date).getTime();
  const end = endOfMonth(date).getTime();
  const rows = await db.getAllAsync<{
    kind: MoneyKind;
    ledger: ExpenseLedger;
    amount: number;
  }>(
    'SELECT kind, ledger, amount FROM money_entries WHERE entry_date >= ? AND entry_date <= ?',
    [start, end],
  );
  return rows.reduce<MonthMoneyTotals>(
    (acc, row) => {
      if (row.kind === 'lend') {
        acc.lendTotal += row.amount;
      } else if (row.ledger === 'office') {
        acc.expenseOffice += row.amount;
      } else {
        acc.expensePersonal += row.amount;
      }
      return acc;
    },
    { expenseOffice: 0, expensePersonal: 0, lendTotal: 0 },
  );
}

export function formatRs(amount: number): string {
  const rounded = Math.round(amount);
  return `Rs ${rounded.toLocaleString('en-NP')}`;
}
