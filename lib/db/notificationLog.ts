import * as Crypto from 'expo-crypto';

import { getDatabase } from '@/lib/db/database';
import { NotificationLog, NotificationTier } from '@/types';

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

export async function countSnoozeSignals(reminderId: string): Promise<number> {
  const database = await getDatabase();
  // Approximate: many alert firings relative to a single reminder suggest friction
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
