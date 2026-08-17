export const MAX_ALERTS_EACH_SIDE = 5;
export const DAILY_UNTIL_DONE_DAYS = 7;
export const MIN_ALERT_GAP_MS = 2 * 60 * 1000;

const BEFORE_LADDER = [180, 120, 60, 30, 15];
const AFTER_LADDER = [15, 30, 60, 90, 120];

export function clampAlertCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(MAX_ALERTS_EACH_SIDE, Math.round(count)));
}

/** Minutes before / after due time (always plus one alert at due time). */
export function careAlertOffsets(
  beforeCount: number,
  afterCount: number,
): { before: number[]; after: number[] } {
  const b = clampAlertCount(beforeCount);
  const a = clampAlertCount(afterCount);
  return {
    before: BEFORE_LADDER.slice(BEFORE_LADDER.length - b),
    after: AFTER_LADDER.slice(0, a),
  };
}

export function careAlertSummary(beforeCount: number, afterCount: number): string {
  const b = clampAlertCount(beforeCount);
  const a = clampAlertCount(afterCount);
  const parts: string[] = ['Once at the due time'];
  if (b > 0) {
    parts.push(
      b === 1
        ? '1 reminder before'
        : `${b} reminders before (${careAlertOffsets(b, 0).before.map((m) => `${m}m`).join(', ')})`,
    );
  }
  if (a > 0) {
    parts.push(
      a === 1
        ? '1 follow-up after if not Done'
        : `${a} follow-ups after if not Done`,
    );
  }
  return parts.join(' · ');
}

/** Migrate legacy 0 Gentle / 1 Standard / 2 Strong. */
export function migrateLegacyAlertStrength(strength: number): {
  before: number;
  after: number;
} {
  if (strength <= 0) return { before: 0, after: 0 };
  if (strength === 1) return { before: 0, after: 1 };
  return { before: 1, after: 1 };
}
