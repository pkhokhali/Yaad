import * as Crypto from 'expo-crypto';

import { getDatabase } from '@/lib/db/database';
import {
  Category,
  Reminder,
  RepeatRule,
  UrgencyCurve,
} from '@/types';

export type CreateReminderInput = {
  title: string;
  notes?: string | null;
  due_at: number;
  category: Category;
  repeat_rule?: RepeatRule;
  urgency_curve?: UrgencyCurve;
  is_urgent?: boolean;
};

export type UpdateReminderInput = Partial<{
  title: string;
  notes: string | null;
  due_at: number;
  category: Category;
  repeat_rule: RepeatRule;
  urgency_curve: UrgencyCurve;
  is_done: number;
  is_urgent: number;
}>;

function mapRow(row: Reminder): Reminder {
  return {
    ...row,
    notes: row.notes ?? null,
    repeat_rule: (row.repeat_rule as RepeatRule) ?? null,
    category: (row.category as Category) || 'general',
    urgency_curve: (row.urgency_curve as UrgencyCurve) || 'standard',
  };
}

export async function createReminder(
  input: CreateReminderInput,
): Promise<Reminder> {
  const database = await getDatabase();
  const id = Crypto.randomUUID();
  const created_at = Date.now();
  const reminder: Reminder = {
    id,
    title: input.title.trim(),
    notes: input.notes?.trim() || null,
    due_at: input.due_at,
    category: input.category,
    repeat_rule: input.repeat_rule ?? null,
    urgency_curve: input.urgency_curve ?? 'standard',
    is_done: 0,
    created_at,
    is_urgent: input.is_urgent ? 1 : 0,
  };

  await database.runAsync(
    `INSERT INTO reminders
      (id, title, notes, due_at, category, repeat_rule, urgency_curve, is_done, created_at, is_urgent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id,
      reminder.title,
      reminder.notes,
      reminder.due_at,
      reminder.category,
      reminder.repeat_rule,
      reminder.urgency_curve,
      reminder.is_done,
      reminder.created_at,
      reminder.is_urgent ?? 0,
    ],
  );

  return reminder;
}

export async function updateReminder(
  id: string,
  input: UpdateReminderInput,
): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  (Object.keys(input) as (keyof UpdateReminderInput)[]).forEach((key) => {
    const value = input[key];
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value as string | number | null);
    }
  });

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export async function deleteReminder(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM notification_log WHERE reminder_id = ?', [
    id,
  ]);
  await database.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
}

export async function getReminderById(id: string): Promise<Reminder | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Reminder>(
    'SELECT * FROM reminders WHERE id = ?',
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function listReminders(): Promise<Reminder[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Reminder>(
    'SELECT * FROM reminders ORDER BY due_at ASC',
  );
  return rows.map(mapRow);
}

export async function listTodayReminders(): Promise<Reminder[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const database = await getDatabase();
  const rows = await database.getAllAsync<Reminder>(
    `SELECT * FROM reminders
     WHERE due_at BETWEEN ? AND ?
     ORDER BY is_done ASC, due_at ASC`,
    [start.getTime(), end.getTime()],
  );
  return rows.map(mapRow);
}

export async function listRecentReminders(limit = 30): Promise<Reminder[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Reminder>(
    'SELECT * FROM reminders ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(mapRow);
}

export async function markDone(id: string): Promise<void> {
  await updateReminder(id, { is_done: 1 });
}

export async function snoozeReminder(
  id: string,
  minutes: number,
): Promise<number> {
  const reminder = await getReminderById(id);
  if (!reminder) throw new Error('Reminder not found');
  const due_at = Math.max(Date.now(), reminder.due_at) + minutes * 60 * 1000;
  await updateReminder(id, { due_at, is_done: 0 });
  return due_at;
}
