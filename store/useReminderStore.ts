import { create } from 'zustand';

import {
  createReminder,
  CreateReminderInput,
  deleteReminder,
  getReminderById,
  listTodayReminders,
  markDone,
  snoozeReminder,
  updateReminder,
  UpdateReminderInput,
} from '@/lib/db/reminders';
import {
  cancelAllForReminder,
  completeWithRepeat,
  findNearestUpcoming,
  maybeAdaptUrgency,
  scheduleReminderNotifications,
} from '@/lib/services/notifications';
import { getStreak, recordActivity } from '@/lib/services/streak';
import { AppSettings, Reminder } from '@/types';

type ReminderState = {
  reminders: Reminder[];
  streak: number;
  loading: boolean;
  highlightId: string | null;
  ready: boolean;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  addReminder: (
    input: CreateReminderInput,
    settings: AppSettings,
  ) => Promise<Reminder>;
  editReminder: (
    id: string,
    input: UpdateReminderInput,
    settings: AppSettings,
  ) => Promise<void>;
  completeReminder: (id: string, settings: AppSettings) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  snooze: (
    id: string,
    minutes: number,
    settings: AppSettings,
  ) => Promise<void>;
  getById: (id: string) => Promise<Reminder | null>;
};

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  streak: 0,
  loading: false,
  highlightId: null,
  ready: false,

  bootstrap: async () => {
    set({ loading: true });
    const [reminders, streak] = await Promise.all([
      listTodayReminders(),
      getStreak(),
    ]);
    set({
      reminders,
      streak,
      highlightId: findNearestUpcoming(reminders),
      loading: false,
      ready: true,
    });
  },

  refresh: async () => {
    const [reminders, streak] = await Promise.all([
      listTodayReminders(),
      getStreak(),
    ]);
    set({
      reminders,
      streak,
      highlightId: findNearestUpcoming(reminders),
    });
  },

  addReminder: async (input, settings) => {
    const reminder = await createReminder({
      ...input,
      urgency_curve: input.urgency_curve ?? settings.defaultUrgencyCurve,
    });
    await scheduleReminderNotifications(reminder, settings);
    await recordActivity();
    await get().refresh();
    return reminder;
  },

  editReminder: async (id, input, settings) => {
    await updateReminder(id, input);
    const reminder = await getReminderById(id);
    if (reminder) {
      await scheduleReminderNotifications(reminder, settings);
    }
    await get().refresh();
  },

  completeReminder: async (id, settings) => {
    const reminder = await getReminderById(id);
    if (!reminder) return;
    if (reminder.repeat_rule) {
      await completeWithRepeat(reminder, settings);
    } else {
      await markDone(id);
      await cancelAllForReminder(id);
    }
    await recordActivity();
    await get().refresh();
  },

  removeReminder: async (id) => {
    await cancelAllForReminder(id);
    await deleteReminder(id);
    await get().refresh();
  },

  snooze: async (id, minutes, settings) => {
    await snoozeReminder(id, minutes);
    await maybeAdaptUrgency(id);
    const reminder = await getReminderById(id);
    if (reminder) {
      // Re-read after possible urgency upgrade
      const latest = await getReminderById(id);
      if (latest) await scheduleReminderNotifications(latest, settings);
    }
    await get().refresh();
  },

  getById: async (id) => getReminderById(id),
}));
