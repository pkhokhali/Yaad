export type Category = 'call' | 'document' | 'repeat' | 'general';
export type RepeatRule = 'daily' | 'weekly' | 'after_visit' | null;
export type UrgencyCurve = 'standard' | 'escalating';
export type NotificationTier = 'nudge' | 'alert';
export type VoiceLanguage = 'en' | 'ne' | 'new';

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
}

export interface NotificationLog {
  id: string;
  reminder_id: string;
  fired_at: number | null;
  tier: NotificationTier;
}

export interface AppSettings {
  quietHoursStart: number; // hour 0-23
  quietHoursEnd: number; // hour 0-23
  defaultUrgencyCurve: UrgencyCurve;
  notificationSound: 'default' | 'subtle' | 'prominent';
  quietHoursEnabled: boolean;
  voiceLanguage: VoiceLanguage;
  speakAlerts: boolean;
}

export interface ParsedCapture {
  title: string;
  dueAt: Date;
  category: Category;
  rawText: string;
  confident: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  quietHoursStart: 22,
  quietHoursEnd: 7,
  defaultUrgencyCurve: 'standard',
  notificationSound: 'default',
  quietHoursEnabled: true,
  voiceLanguage: 'en',
  speakAlerts: true,
};
