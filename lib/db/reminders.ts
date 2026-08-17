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
  image_uri?: string | null;
  items?: { label: string; done: boolean }[];
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
  image_uri: string | null;
  items: { label: string; done: boolean }[] | null;
}>;

function parseItems(raw: unknown): Reminder['items'] {
  if (Array.isArray(raw)) {
    return raw
      .filter((row) => row && typeof row.label === 'string')
      .map((row) => ({
        label: String(row.label),
        done: Boolean(row.done),
      }));
  }
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    return parseItems(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function mapRow(row: Reminder & { items_json?: string | null }): Reminder {
  return {
    ...row,
    notes: row.notes ?? null,
    repeat_rule: (row.repeat_rule as RepeatRule) ?? null,
    category: (row.category as Category) || 'general',
    urgency_curve: (row.urgency_curve as UrgencyCurve) || 'standard',
    image_uri: row.image_uri ?? null,
    items: parseItems(row.items_json) ?? parseItems(row.items),
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
    image_uri: input.image_uri ?? null,
    items: input.items,
  };

  await database.runAsync(
    `INSERT INTO reminders
      (id, title, notes, due_at, category, repeat_rule, urgency_curve, is_done, created_at, is_urgent, image_uri, items_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      reminder.image_uri ?? null,
      reminder.items ? JSON.stringify(reminder.items) : null,
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
    if (value === undefined) return;
    if (key === 'items') {
      fields.push('items_json = ?');
      values.push(value ? JSON.stringify(value) : null);
      return;
    }
    fields.push(`${key} = ?`);
    values.push(value as string | number | null);
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
     WHERE (is_done = 0 AND due_at <= ?)
        OR (is_done = 1 AND due_at BETWEEN ? AND ?)
     ORDER BY is_done ASC, due_at ASC`,
    [end.getTime(), start.getTime(), end.getTime()],
  );
  return rows.map(mapRow);
}

export async function listOpenThrough(endMs: number): Promise<Reminder[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Reminder>(
    `SELECT * FROM reminders
     WHERE is_done = 0 AND due_at <= ?
     ORDER BY due_at ASC`,
    [endMs],
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
