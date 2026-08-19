import * as Crypto from 'expo-crypto';

import { getDatabase } from '@/lib/db/database';
import { NotificationLog, NotificationTier, Category } from '@/types';

export type NotificationHistoryEntry = NotificationLog & {
  reminder_title: string | null;
  reminder_category: Category | null;
};

export async function listNotificationHistory(
  limit = 120,
): Promise<NotificationHistoryEntry[]> {
  const database = await getDatabase();
  return database.getAllAsync<NotificationHistoryEntry>(
    `SELECT nl.id, nl.reminder_id, nl.fired_at, nl.tier,
            r.title AS reminder_title, r.category AS reminder_category
     FROM notification_log nl
     LEFT JOIN reminders r ON r.id = nl.reminder_id
     ORDER BY nl.fired_at DESC
     LIMIT ?`,
    [limit],
  );
}

export async function logNotification(
  reminderId: string,
  tier: NotificationTier,
  firedAt: number = Date.now(),
): Promise<NotificationLog> {
  const database = await getDatabase();
  const entry: NotificationLog = {
    id: Crypto.randomUUID(),
    reminder_id: reminderId,
    fired_at: firedAt,
    tier,
  };

  await database.runAsync(
    `INSERT INTO notification_log (id, reminder_id, fired_at, tier)
     VALUES (?, ?, ?, ?)`,
    [entry.id, entry.reminder_id, entry.fired_at, entry.tier],
  );

  return entry;
}

export async function recordNotificationFired(
  reminderId: string,
  tier: string,
  firedAt: number = Date.now(),
): Promise<void> {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM notification_log
     WHERE reminder_id = ? AND tier = ? AND fired_at > ?
     LIMIT 1`,
    [reminderId, tier, firedAt - 90_000],
  );
  if (existing) return;

  const normalizedTier: NotificationTier =
    tier === 'nudge' || tier.startsWith('pre') ? 'nudge' : 'alert';
  await logNotification(reminderId, normalizedTier, firedAt);
}

export async function countSnoozeSignals(reminderId: string): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM notification_log
     WHERE reminder_id = ? AND tier = 'alert'`,
    [reminderId],
  );
  return row?.count ?? 0;
}

export async function clearLogsForReminder(reminderId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'DELETE FROM notification_log WHERE reminder_id = ?',
    [reminderId],
  );
}
