export const MAX_CARE_ALERTS = 2;
export const DAILY_UNTIL_DONE_DAYS = 7;
export const MIN_ALERT_GAP_MS = 2 * 60 * 1000;

/** 0 Gentle · 1 Standard · 2 Strong */
const BEFORE: number[][] = [[], [], [15]];
const AFTER: number[][] = [[], [30], [30]];

export function clampCareAlerts(count: number): number {
  if (!Number.isFinite(count)) return 1;
  return Math.max(0, Math.min(MAX_CARE_ALERTS, Math.round(count)));
}

/** Minutes before / after due time. Strength above 2 (old setting) becomes Strong. */
export function careAlertOffsets(count: number): {
  before: number[];
  after: number[];
} {
  const n = clampCareAlerts(count > 2 ? 2 : count);
  return { before: BEFORE[n], after: AFTER[n] };
}

export function careAlertHint(count: number): string {
  const n = clampCareAlerts(count > 2 ? 2 : count);
  if (n === 0) return 'Once, at the time you set.';
  if (n === 1) {
    return 'At the time. If you haven’t said Done, once more after 30 minutes.';
  }
  return '15 minutes before, at the time, then once more if not Done.';
}

export const ALERT_STRENGTHS = [
  { value: 0, label: 'Gentle', hint: 'Once at the time' },
  { value: 1, label: 'Standard', hint: 'At the time, then once more if not Done' },
  { value: 2, label: 'Strong', hint: 'A heads-up before, then a follow-up' },
] as const;
