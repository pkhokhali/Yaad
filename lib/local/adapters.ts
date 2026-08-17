import { Category, Reminder, RepeatRule, UrgencyCurve } from '@/types';
import {
  CreateYaadItemInput,
  RecurrenceRule,
  UpdateYaadItemInput,
  YaadCategory,
  YaadItem,
  YaadStatus,
} from '@/types/yaad';

const LEGACY_TO_YAAD: Record<Category, YaadCategory> = {
  medicine: 'Medicine',
  buy: 'Shopping',
  doctor: 'Appointment',
  call: 'People',
  general: 'Task',
  document: 'Other',
  repeat: 'Task',
};

const YAAD_TO_LEGACY: Record<YaadCategory, Category> = {
  Medicine: 'medicine',
  Shopping: 'buy',
  Appointment: 'doctor',
  People: 'call',
  Task: 'general',
  Event: 'general',
  Other: 'general',
};

export function legacyCategoryToYaad(category: Category): YaadCategory {
  return LEGACY_TO_YAAD[category] ?? 'Task';
}

export function yaadCategoryToLegacy(category: YaadCategory): Category {
  return YAAD_TO_LEGACY[category] ?? 'general';
}

function repeatRuleToRecurrence(
  rule: RepeatRule | null | undefined,
): RecurrenceRule {
  if (rule === 'daily' || rule === 'weekly') return rule;
  return null;
}

function recurrenceToRepeatRule(rule: RecurrenceRule): RepeatRule {
  if (rule === 'daily') return 'daily';
  if (rule === 'weekly') return 'weekly';
  return null;
}

function statusToDone(status: YaadStatus): number {
  return status === 'Done' ? 1 : 0;
}

function doneToStatus(
  isDone: number | undefined,
  status?: YaadStatus,
): YaadStatus {
  if (status) return status;
  return isDone ? 'Done' : 'Pending';
}

export function reminderToYaadItem(reminder: Reminder): YaadItem {
  return {
    id: reminder.id,
    ownerId: 'local',
    linkedProfileId: null,
    title: reminder.title,
    notes: reminder.notes,
    photoUrl: reminder.image_uri ?? null,
    category: legacyCategoryToYaad(reminder.category),
    dueDate: reminder.due_at,
    isRecurring: Boolean(reminder.repeat_rule),
    recurrenceRule: repeatRuleToRecurrence(reminder.repeat_rule),
    isImportant: Boolean(reminder.is_urgent),
    voiceNoteUrl: null,
    status: reminder.is_done ? 'Done' : 'Pending',
    createdAt: reminder.created_at,
    updatedAt: reminder.created_at,
  };
}

export function yaadItemToReminder(item: YaadItem): Reminder {
  return {
    id: item.id,
    title: item.title,
    notes: item.notes,
    due_at: item.dueDate,
    category: yaadCategoryToLegacy(item.category),
    repeat_rule: recurrenceToRepeatRule(item.recurrenceRule),
    urgency_curve: 'standard' as UrgencyCurve,
    is_done: statusToDone(item.status),
    created_at: item.createdAt,
    is_urgent: item.isImportant ? 1 : 0,
    image_uri: item.photoUrl,
  };
}

export type LegacyCreateInput = {
  title: string;
  notes?: string | null;
  due_at: number;
  category: Category;
  repeat_rule?: RepeatRule;
  urgency_curve?: UrgencyCurve;
  is_urgent?: boolean;
  image_uri?: string | null;
};

export function legacyCreateToYaadInput(
  input: LegacyCreateInput,
): CreateYaadItemInput {
  return {
    title: input.title,
    notes: input.notes ?? null,
    photoUrl: input.image_uri ?? null,
    category: legacyCategoryToYaad(input.category),
    dueDate: input.due_at,
    isRecurring: Boolean(input.repeat_rule),
    recurrenceRule: repeatRuleToRecurrence(input.repeat_rule),
    isImportant: Boolean(input.is_urgent),
  };
}

export function yaadInputToLegacyCreate(
  input: CreateYaadItemInput,
): LegacyCreateInput {
  return {
    title: input.title,
    notes: input.notes,
    due_at: input.dueDate,
    category: yaadCategoryToLegacy(input.category),
    repeat_rule: recurrenceToRepeatRule(input.recurrenceRule ?? null),
    is_urgent: input.isImportant,
    image_uri: input.photoUrl,
  };
}

export type LegacyUpdateInput = Partial<{
  title: string;
  notes: string | null;
  due_at: number;
  category: Category;
  repeat_rule: RepeatRule;
  urgency_curve: UrgencyCurve;
  is_done: number;
  is_urgent: number;
  image_uri: string | null;
}>;

export function legacyUpdateToYaadPatch(
  input: LegacyUpdateInput,
): UpdateYaadItemInput {
  const patch: UpdateYaadItemInput = { updatedAt: Date.now() };

  if (input.title !== undefined) patch.title = input.title;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.due_at !== undefined) patch.dueDate = input.due_at;
  if (input.category !== undefined) {
    patch.category = legacyCategoryToYaad(input.category);
  }
  if (input.repeat_rule !== undefined) {
    patch.recurrenceRule = repeatRuleToRecurrence(input.repeat_rule);
    patch.isRecurring = Boolean(input.repeat_rule);
  }
  if (input.is_urgent !== undefined) patch.isImportant = Boolean(input.is_urgent);
  if (input.image_uri !== undefined) patch.photoUrl = input.image_uri;
  if (input.is_done !== undefined) {
    patch.status = doneToStatus(input.is_done);
  }

  return patch;
}

export function yaadPatchToLegacyUpdate(
  patch: UpdateYaadItemInput,
): LegacyUpdateInput {
  const out: LegacyUpdateInput = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.notes !== undefined) out.notes = patch.notes;
  if (patch.dueDate !== undefined) out.due_at = patch.dueDate;
  if (patch.category !== undefined) {
    out.category = yaadCategoryToLegacy(patch.category);
  }
  if (patch.recurrenceRule !== undefined) {
    out.repeat_rule = recurrenceToRepeatRule(patch.recurrenceRule);
  }
  if (patch.isImportant !== undefined) out.is_urgent = patch.isImportant ? 1 : 0;
  if (patch.photoUrl !== undefined) out.image_uri = patch.photoUrl;
  if (patch.status !== undefined) out.is_done = statusToDone(patch.status);
  return out;
}
