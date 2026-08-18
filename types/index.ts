export type Category =
  | 'medicine'
  | 'buy'
  | 'doctor'
  | 'call'
  | 'general'
  | 'document'
  | 'repeat';
export type RepeatRule = 'daily' | 'weekly' | 'after_visit' | null;
export type UrgencyCurve = 'standard' | 'escalating';
export type NotificationTier = 'nudge' | 'alert';
export type VoiceLanguage = 'en' | 'ne' | 'new';

export type ThemeName = 'dark' | 'normal';
export type ScaleMode = 'standard' | 'comfort';
export type SetupFor = 'me' | 'family';

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  due_at: number;
  category: Category;
  repeat_rule: RepeatRule;
  urgency_curve: UrgencyCurve;
  is_done: number;
  created_at: number;
  is_urgent?: number;
  image_uri?: string | null;
  items?: ChecklistItem[];
}

export interface NotificationLog {
  id: string;
  reminder_id: string;
  fired_at: number | null;
  tier: NotificationTier;
}

export interface AppSettings {
  /** Minutes from midnight (0–1439). */
  quietHoursStart: number;
  /** Minutes from midnight (0–1439). */
  quietHoursEnd: number;
  defaultUrgencyCurve: UrgencyCurve;
  notificationSound: 'default' | 'subtle' | 'prominent';
  quietHoursEnabled: boolean;
  voiceLanguage: VoiceLanguage;
  speakAlerts: boolean;
  /** Reminders before due time (0–5). Always one alert at due time. */
  alertsBeforeCount: number;
  /** Follow-up reminders after due if not Done (0–5). */
  alertsAfterCount: number;
  /** @deprecated migrated to alertsBeforeCount / alertsAfterCount */
  alertsBeforeDeadline?: number;
  appearanceTheme: ThemeName;
  appearanceScale: ScaleMode;
  onboardingComplete: boolean;
  setupFor: SetupFor | null;
  displayName: string;
}

export interface ParsedCapture {
  title: string;
  dueAt: Date;
  category: Category;
  rawText: string;
  confident: boolean;
  repeatDaily: boolean;
  items?: ChecklistItem[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  quietHoursStart: 22 * 60,
  quietHoursEnd: 7 * 60,
  defaultUrgencyCurve: 'standard',
  notificationSound: 'default',
  quietHoursEnabled: true,
  voiceLanguage: 'en',
  speakAlerts: true,
  alertsBeforeCount: 0,
  alertsAfterCount: 1,
  appearanceTheme: 'normal',
  appearanceScale: 'standard',
  onboardingComplete: false,
  setupFor: null,
  displayName: '',
};

export function minutesToClockLabel(mins: number): string {
  const total = ((Math.round(mins) % 1440) + 1440) % 1440;
  const d = new Date();
  d.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function dateFromMinutes(mins: number): Date {
  const total = ((Math.round(mins) % 1440) + 1440) % 1440;
  const d = new Date();
  d.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return d;
}

export function minutesFromDate(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export * from './yaad';
