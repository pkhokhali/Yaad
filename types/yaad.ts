export type YaadCategory =
  | 'Medicine'
  | 'Task'
  | 'Shopping'
  | 'Appointment'
  | 'Event'
  | 'People'
  | 'Other';

export type YaadStatus = 'Pending' | 'Done' | 'Snoozed' | 'Missed';

export type RecurrenceRule = 'daily' | 'weekly' | null;

export type PriorityBucket = 'Today' | 'Upcoming' | 'Important' | 'Urgent';

export type UiMode = 'Standard' | 'Elder';

export type AdherenceStatus = 'Taken' | 'Missed' | 'Snoozed';

export interface YaadItem {
  id: string;
  ownerId: string;
  linkedProfileId: string | null;
  title: string;
  notes: string | null;
  photoUrl: string | null;
  category: YaadCategory;
  dueDate: number;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule;
  isImportant: boolean;
  voiceNoteUrl: string | null;
  status: YaadStatus;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  mode: UiMode;
  linkedCaregivers: string[];
  linkedElders: string[];
  language: 'en' | 'ne';
  streak: number;
  lastActivityDate: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AdherenceLog {
  id: string;
  yaadItemId: string;
  profileId: string;
  date: string;
  status: AdherenceStatus;
  timestamp: number;
}

export type CreateYaadItemInput = {
  title: string;
  notes?: string | null;
  photoUrl?: string | null;
  category: YaadCategory;
  dueDate: number;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  isImportant?: boolean;
  linkedProfileId?: string | null;
  voiceNoteUrl?: string | null;
};

export type UpdateYaadItemInput = Partial<
  Omit<YaadItem, 'id' | 'ownerId' | 'createdAt'>
>;
