import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  due_at INTEGER NOT NULL,
  category TEXT,
  repeat_rule TEXT,
  urgency_curve TEXT DEFAULT 'standard',
  is_done INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  is_urgent INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notification_log (
  id TEXT PRIMARY KEY,
  reminder_id TEXT REFERENCES reminders(id),
  fired_at INTEGER,
  tier TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('yaad.db');
  await db.execAsync(SCHEMA);
  // Migrate older DBs that may lack is_urgent
  try {
    await db.execAsync(
      'ALTER TABLE reminders ADD COLUMN is_urgent INTEGER DEFAULT 0',
    );
  } catch {
    // column already exists
  }
  return db;
}

export async function getMeta(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
    [key, value],
  );
}
