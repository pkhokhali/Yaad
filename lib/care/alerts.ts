export const MAX_CARE_ALERTS = 6;
export const DAILY_UNTIL_DONE_DAYS = 14;

const BEFORE: number[][] = [
  [],
  [15],
  [30, 5],
  [60, 20, 5],
  [90, 40, 15, 5],
  [120, 60, 30, 10, 3],
  [120, 60, 30, 15, 5, 1],
];

const AFTER: number[][] = [
  [],
  [20],
  [15, 60],
  [10, 30, 90],
  [10, 25, 60, 180],
  [5, 20, 45, 90, 180],
  [5, 15, 30, 60, 120, 240],
];

export function clampCareAlerts(count: number): number {
  if (!Number.isFinite(count)) return 3;
  return Math.max(0, Math.min(MAX_CARE_ALERTS, Math.round(count)));
}

/** Minutes before / after due time for a strength of 0–6. */
export function careAlertOffsets(count: number): {
  before: number[];
  after: number[];
} {
  const n = clampCareAlerts(count);
  return { before: BEFORE[n], after: AFTER[n] };
}

export function careAlertHint(count: number): string {
  const n = clampCareAlerts(count);
  if (n === 0) {
    return 'Once at the time. If you haven’t said Done, once a day until you do.';
  }
  return `${n} times before. If you haven’t said Done, ${n} more times. Then once a day until you do.`;
}
